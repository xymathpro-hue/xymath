type ClassValue = string | number | boolean | undefined | null | ClassValue[]

export function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = []
  
  for (const input of inputs) {
    if (!input) continue
    
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input))
    } else if (Array.isArray(input)) {
      const inner = clsx(...input)
      if (inner) classes.push(inner)
    }
  }
  
  return classes.join(' ')
}
