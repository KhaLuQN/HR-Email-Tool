/**
 * Simple template engine: replaces {{name}} with actual values
 */
export function applyTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`
  })
}
