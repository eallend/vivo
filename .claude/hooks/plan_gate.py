#!/usr/bin/env python3
# planning-framework
"""PreToolUse hook: the planning gate.

State lives in <project>/.planning/:
  active    created by Claude when /feature starts
  approved  created only by plan_approve.py when the user sends "approve plan"
  gate.log  audit trail written by the hooks
No `active` file  -> the gate is off, normal work is not affected.
`active` without `approved` -> only docs/, .superpowers/ (superpowers scratch:
mockups, spikes), .gitignore and temp files may change. Reading is never blocked,
and neither is git (commits of documents are fine).
Exit code 2 blocks the tool call and returns stderr to Claude.
"""
import json
import os
import re
import shlex
import sys
import tempfile
import time

PROTECTED = (".claude/hooks", ".claude/settings.json", ".claude/settings.local.json")
BASH_PROTECTED = (".planning", ".claude/hooks", ".claude/settings")
READONLY = {"ls", "cat", "head", "tail", "wc", "stat", "test", "[", "grep", "rg", "find", "file",
            "less", "du", "tree", "diff", "echo", "printf", "sort", "uniq", "cut", "awk", "xxd", "jq"}
INTERPRETERS = {"python", "python3", "node", "ruby", "perl", "bash", "sh", "zsh", "deno", "bun"}
COPIERS = {"cp", "mv", "rsync", "install", "ln"}
CODE_WRITES = re.compile(
    r"open\([^)]*['\"][wax]|\.write\(|write_text|write_bytes|writeFile|appendFile|createWriteStream"
    r"|fs\.(rename|rm|unlink|cp|copyFile)|shutil\.|os\.(remove|rename|replace|unlink)|subprocess|child_process")
SHELLS = {"bash", "sh", "zsh"}
SHELL_WRITES = re.compile(r"(?<![0-9&>=-])>>?(?!&)\s*(?!/dev/null)\S|\btee\b|\bsed\s+-\w*i")
HEREDOC = re.compile(r"<<-?\s*(['\"]?)(\w+)\1([^\n]*)\n(.*?)\n[ \t]*\2[ \t]*(?=\n|$)", re.S)
SEPARATORS = {";", "&&", "||", "|", "&", "(", ")", "|&", ";;"}

root = tool = target = ""


def log(line):
    try:
        d = os.path.join(root, ".planning")
        if os.path.isdir(d):
            with open(os.path.join(d, "gate.log"), "a") as f:
                f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + line + "\n")
    except Exception:
        pass


def block(msg):
    log(f"BLOCK {tool} {target!r}: {msg[:90]}")
    print(msg, file=sys.stderr)
    sys.exit(2)


def rel_parts(path):
    """Path relative to the project root as a list of segments ('..' first if outside)."""
    path = os.path.expanduser(path)
    full = os.path.realpath(path if os.path.isabs(path) else os.path.join(root, path))
    return full, os.path.relpath(full, root).replace(os.sep, "/").split("/")


def planning_ok(path):
    """May this path be written while the plan is not approved?"""
    if path in ("/dev/null", "/dev/stdout", "/dev/stderr") or "$" in path and path.startswith(("$TMPDIR", "${TMPDIR")):
        return True
    full, parts = rel_parts(path)
    if parts[0] != "..":                                               # inside the project
        return parts[0] == ".superpowers" or "/".join(parts) == ".gitignore" or "docs" in parts[:-1]
    tmp = [os.path.realpath(p) for p in ("/tmp", tempfile.gettempdir())]
    return any(full == t or full.startswith(t + os.sep) for t in tmp)


def simple_commands(cmd):
    """Split a shell line into simple commands: (words, redirect_targets). None if it cannot be parsed."""
    try:
        lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
        lex.whitespace_split = True
        tokens = list(lex)
    except ValueError:
        return None
    out, words, redirs, i = [], [], [], 0
    while i < len(tokens):
        t = tokens[i]
        if t in SEPARATORS:
            if words or redirs:
                out.append((words, redirs))
            words, redirs = [], []
        elif t and set(t) <= set("<>&|") and ">" in t:
            nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
            if not (t.endswith("&") and (nxt.isdigit() or nxt == "-")):   # 2>&1 is not a file
                redirs.append(nxt)
            if words and words[-1].isdigit():
                words.pop()                                             # the "2" of 2>file
            i += 1
        elif t and set(t) <= set("<>&|"):
            i += 1                                                      # input redirect: skip its source
        else:
            words.append(t)
        i += 1
    if words or redirs:
        out.append((words, redirs))
    return out


def check_bash(cmd, gate_closed):
    bodies = [m.group(4) for m in HEREDOC.finditer(cmd)]
    stripped = HEREDOC.sub(lambda m: "<<" + m.group(2) + m.group(3), cmd)
    cmds = simple_commands(stripped)
    if cmds is None:                                                    # unparsable: be conservative
        for p in BASH_PROTECTED:
            if p in cmd:
                block(f"Blocked: this command touches '{p}' and could not be parsed. Only the user manages the gate.")
        if gate_closed and re.search(r"(?<![0-9&>=-])>>?(?!&)\s*(?!/dev/null)\S|\btee\b|\bsed\s+-\w*i", stripped):
            block("Blocked: the plan is not approved, so shell commands may not write files outside docs/.")
        return
    for words, redirs in cmds:
        if not words:
            words = [""]
        name = os.path.basename(words[0])
        args = words[1:]
        # 1. the gate's own files: reading is fine, anything else is not
        touches = [w for w in words + redirs if any(p in w for p in BASH_PROTECTED)]
        if touches:
            readonly = name in READONLY and not any(any(p in r for p in BASH_PROTECTED) for r in redirs) \
                and not (name == "find" and any(a in ("-delete", "-exec", "-execdir", "-ok") for a in args))
            if not readonly:
                block(f"Blocked: shell commands may read but not change '{touches[0]}'. Only the user manages the gate "
                      "(to look at it, use ls/cat or the Read tool).")
        if not gate_closed:
            continue
        # 2. before approval: no writes outside docs/, .superpowers/, temp
        why = "Blocked: the plan is not approved, so only files inside docs/ may change (use the Edit/Write tools for documents). "
        for r in redirs:
            if not planning_ok(r):
                block(why + f"This command redirects output to '{r}'.")
        if name == "tee" and any(not a.startswith("-") and not planning_ok(a) for a in args):
            block(why + "This command writes a file with tee.")
        if name in ("sed", "perl") and any(re.match(r"-\w*i", a) for a in args) and not (args and planning_ok(args[-1])):
            block(why + "This command edits a file in place.")
        if name in COPIERS and args and not planning_ok(args[-1]):
            block(why + f"This command copies or moves a file to '{args[-1]}'.")
        if name == "git" and args[:1] == ["apply"] or name == "patch":
            block(why + "This command applies a patch.")
        if name in INTERPRETERS:
            inline = [args[i + 1] for i, a in enumerate(args[:-1]) if a in ("-c", "-e", "--eval")]
            code = "\n".join(inline + (bodies if "<<" in stripped else []))
            if code and (CODE_WRITES.search(code) or name in SHELLS and SHELL_WRITES.search(code)):
                block(why + "This inline script writes files.")


try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool = data.get("tool_name", "")
inp = data.get("tool_input") or {}
root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd())
active = os.path.exists(os.path.join(root, ".planning", "active"))
approved = os.path.exists(os.path.join(root, ".planning", "approved"))
gate_closed = active and not approved

if tool == "Bash":
    cmd = inp.get("command", "")
    target = cmd[:200]
    check_bash(cmd, gate_closed)
    sys.exit(0)

if tool in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
    path = inp.get("file_path") or inp.get("notebook_path") or ""
    if not path:
        sys.exit(0)
    full, parts = rel_parts(path)
    rel = "/".join(parts)
    target = rel

    for p in PROTECTED:
        if rel == p or rel.startswith(p + "/"):
            block(f"Blocked: '{rel}' is managed only by the user.")

    if parts[0] == ".planning":
        if rel == ".planning/active" and tool == "Write":
            # starting a feature closes the gate and cancels any old approval
            try:
                os.remove(os.path.join(root, ".planning", "approved"))
            except OSError:
                pass
            os.makedirs(os.path.join(root, ".planning"), exist_ok=True)
            log("FEATURE START (gate closed)")
            sys.exit(0)
        block("Blocked: Claude may only write .planning/active. "
              "Approval comes from the user sending the message: approve plan")

    scratch = parts[0] == ".superpowers" or rel == ".gitignore"
    if gate_closed and not scratch and "docs" not in parts[:-1]:
        block("Blocked: the plan is not approved yet, so only files inside docs/ may change. "
              "Finish the critique and plan check, then ask the user to send: approve plan. Do not work around this gate.")

sys.exit(0)
