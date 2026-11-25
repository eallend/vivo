// Turns the reference note PDF into page-tagged passages for keyword search
// and word-for-word quote matching. Run with `pnpm prepare:note`.
import { readFileSync, writeFileSync } from "node:fs"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import type { Passage } from "../src/lib/viva/types.ts"

const NOTE_PDF = new URL(
  "../docs/requirements/Eye Academy - Glaucoma_and_Angle_Closure_Reference_Note.pdf",
  import.meta.url
)
const OUTPUT = new URL("../data/reference-note.passages.json", import.meta.url)

// Items whose baselines differ by less than this sit on the same line.
const SAME_LINE_TOLERANCE = 3
// A horizontal gap wider than this between two words starts a new table column.
const COLUMN_GAP = 10
// Body lines are 16.5pt apart; list items, run-in paragraphs and table rows are 19.5pt or more.
const BLOCK_GAP = 18
// A line ending this close to the page's right text edge wrapped onto the next line.
const FULL_LINE_SLACK = 60

const RUNNING_HEADER = /^eyeacademy Take-home reference note$/
const RUNNING_FOOTER =
  /^Glaucoma and angle closure · Eye Academy reference note \d+$/

interface Item {
  str: string
  x: number
  y: number
  width: number
  height: number
}

interface Line {
  y: number
  height: number
  right: number
  // Runs of words separated by gaps wider than COLUMN_GAP, each with its start x.
  segments: { x: number; text: string }[]
}

interface Block {
  page: number
  heading: string
  lines: Line[]
  // True when the block came straight after a heading on its page.
  afterHeading: boolean
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim()

const lineText = (line: Line) => line.segments.map((s) => s.text).join(" ")

// Joins wrapped lines: a trailing hyphen joins with no space, otherwise one space.
function joinLines(parts: string[]): string {
  return parts.reduce((acc, part) => {
    if (acc === "") return part
    return acc.endsWith("-") ? acc + part : `${acc} ${part}`
  }, "")
}

function toLines(items: Item[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const groups: Item[][] = []
  for (const item of sorted) {
    const current = groups.at(-1)
    if (current && Math.abs(current[0].y - item.y) < SAME_LINE_TOLERANCE)
      current.push(item)
    else groups.push([item])
  }
  return groups.map((group) => {
    group.sort((a, b) => a.x - b.x)
    const segments: Line["segments"] = []
    let lastWordEnd = -Infinity
    let pending = ""
    for (const item of group) {
      const isSpace = item.str.trim() === ""
      if (!isSpace && item.x - lastWordEnd > COLUMN_GAP) {
        segments.push({ x: item.x, text: item.str })
        pending = ""
      } else if (segments.length > 0) {
        if (isSpace) pending += item.str
        else {
          segments[segments.length - 1].text += pending + item.str
          pending = ""
        }
      }
      if (!isSpace) lastWordEnd = item.x + item.width
    }
    for (const s of segments) s.text = collapse(s.text)
    return {
      y: group[0].y,
      height: Math.max(...group.map((i) => i.height)),
      right: lastWordEnd,
      segments,
    }
  })
}

// Splits a block into table columns by the start x of its segments and joins each column's lines.
function blockColumns(block: Block): string[] {
  const starts: number[] = []
  for (const line of block.lines) {
    for (const s of line.segments) {
      if (!starts.some((x) => Math.abs(x - s.x) < 5)) starts.push(s.x)
    }
  }
  starts.sort((a, b) => a - b)
  const columns: string[][] = starts.map(() => [])
  for (const line of block.lines) {
    for (const s of line.segments) {
      let index = 0
      starts.forEach((x, i) => {
        if (Math.abs(x - s.x) < Math.abs(starts[index] - s.x)) index = i
      })
      columns[index].push(s.text)
    }
  }
  return columns.map(joinLines)
}

const blockText = (block: Block) => blockColumns(block).join(" | ")
const isTabular = (block: Block) => blockColumns(block).length > 1

function bodyHeight(lines: Line[]): number {
  const weight = new Map<number, number>()
  for (const line of lines) {
    const length = lineText(line).length
    weight.set(line.height, (weight.get(line.height) ?? 0) + length)
  }
  return [...weight.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

async function readPages(): Promise<Line[][]> {
  const data = new Uint8Array(readFileSync(NOTE_PDF))
  const doc = await getDocument({ data, verbosity: 0 }).promise
  const pages: Line[][] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    const items: Item[] = []
    for (const raw of content.items) {
      if (!("str" in raw) || raw.str === "") continue
      items.push({
        str: raw.str,
        x: raw.transform[4],
        y: raw.transform[5],
        width: raw.width,
        height: raw.height,
      })
    }
    const lines = toLines(items).filter((line) => {
      const text = lineText(line)
      return (
        text !== "" && !RUNNING_HEADER.test(text) && !RUNNING_FOOTER.test(text)
      )
    })
    pages.push(lines)
  }
  return pages
}

function toBlocks(pages: Line[][]): { blocks: Block[]; pageRight: number[] } {
  const body = bodyHeight(pages.flat())
  const blocks: Block[] = []
  const pageRight: number[] = []
  let heading = ""
  // Carried across pages so a heading at the foot of a page still stops a cross-page join.
  let afterHeading = false
  pages.forEach((lines, index) => {
    const page = index + 1
    pageRight[page] = Math.max(...lines.map((l) => l.right))
    let current: Block | null = null
    let previousY = Infinity
    for (const line of lines) {
      if (line.height > body * 1.05) {
        heading = lineText(line)
        current = null
        afterHeading = true
      } else if (current && previousY - line.y <= BLOCK_GAP) {
        current.lines.push(line)
      } else {
        current = { page, heading, lines: [line], afterHeading }
        afterHeading = false
        blocks.push(current)
      }
      previousY = line.y
    }
  })
  return { blocks, pageRight }
}

// The first row of a table is its header (column names) and, under the title, the note's
// metadata line is laid out the same way; neither holds anything to quote or search.
const isHeaderRow = (block: Block, previous: Block | null) =>
  block.lines.length === 1 &&
  isTabular(block) &&
  (block.afterHeading || previous === null || !isTabular(previous))

function toPassages(blocks: Block[], pageRight: number[]): Passage[] {
  const seenTexts = new Set<string>()
  const merged: {
    pages: number[]
    heading: string
    text: string
    drop: boolean
  }[] = []
  let previous: Block | null = null
  for (const block of blocks) {
    const text = blockText(block)
    const firstOnPage = previous === null || previous.page !== block.page
    // A table header row repeated at the top of a page adds nothing.
    if (firstOnPage && previous !== null && seenTexts.has(text)) continue
    seenTexts.add(text)

    const last = merged.at(-1)
    const lastLine = previous?.lines.at(-1)
    const continues =
      firstOnPage &&
      previous !== null &&
      last !== undefined &&
      lastLine !== undefined &&
      !block.afterHeading &&
      !isTabular(previous) &&
      !isTabular(block) &&
      !/[.):]$/.test(last.text) &&
      lastLine.right >= pageRight[previous.page] - FULL_LINE_SLACK
    if (continues) {
      last.pages.push(block.page)
      last.text = joinLines([last.text, text])
    } else {
      merged.push({
        pages: [block.page],
        heading: block.heading,
        text,
        drop: isHeaderRow(block, previous),
      })
    }
    previous = block
  }
  // Ids are numbered before header rows are dropped, so the other passages keep the ids
  // they had when header rows were still included.
  return merged
    .map(({ drop, ...p }, i) => ({
      drop,
      passage: { id: `p-${String(i + 1).padStart(3, "0")}`, ...p },
    }))
    .filter((p) => !p.drop)
    .map((p) => p.passage)
}

const { blocks, pageRight } = toBlocks(await readPages())
const passages = toPassages(blocks, pageRight)
writeFileSync(OUTPUT, `${JSON.stringify(passages, null, 2)}\n`)
console.log(
  `Wrote ${passages.length} passages to data/reference-note.passages.json`
)
