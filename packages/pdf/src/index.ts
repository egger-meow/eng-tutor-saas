export type PdfKind = 'student' | 'parent-answer'

export type PdfArtifact = {
  kind: PdfKind
  filename: `${string}.pdf`
  bytes: Uint8Array
}

export interface PdfRenderer {
  render(markdown: string, kind: PdfKind): Promise<PdfArtifact>
}

export function artifactFilename(kind: PdfKind): `${string}.pdf` {
  return kind === 'student' ? 'student.pdf' : 'parent-answer.pdf'
}
