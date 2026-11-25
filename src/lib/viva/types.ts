export type Eye = "right" | "left" | "both" | null

export interface Finding {
  id: string
  eye: Eye
  label: string
  value: string | number | null
  unit: string | null
  method: string | null
  available: boolean
  unavailable_reason?: string
}

export type PatientField =
  | "age"
  | "sex"
  | "presenting_complaint"
  | "past_ocular_history"
  | "past_medical_history"
  | "medications"
  | "allergies"
  | "family_history"

export type Patient = Record<PatientField, string | number | string[]>

export interface ExaminerNotes {
  diagnosis: string
  key_points: string[]
  follow_up_ideas: string[]
}

export interface CaseData {
  case_id: string
  title: string
  opening_prompt: string
  patient: Patient
  findings: Finding[]
  examiner_notes: ExaminerNotes
}

export interface RevealedFinding {
  id: string
  eye: Eye
  label: string
  available: boolean
  valueText: string | null
  method: string | null
  reason: string | null
  spoken: string
}

export type VivaStatus = "in_progress" | "follow_up_asked" | "finished"

export interface Interpretation {
  findingIds: string[]
  historyFields: PatientField[]
  unknownRequests: string[]
  gaveAnswer: boolean
  followUpQuestion: string | null
}

export interface ExaminerReply {
  spoken: string
  revealed: RevealedFinding[]
  status: VivaStatus
  followUpQuestion: string | null
}

export interface Passage {
  id: string
  pages: number[]
  heading: string
  text: string
}

export type NoSupportReason =
  | "no_answer"
  | "no_passages"
  | "model_unsupported"
  | "quote_not_found"
  | "model_error"

export type RevisionPoint =
  | {
      status: "supported"
      point: string
      pages: number[]
      excerpt: string
      retrievedPages: number[]
    }
  | { status: "no_support"; reason: NoSupportReason; retrievedPages: number[] }
