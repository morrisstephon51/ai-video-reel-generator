declare module 'node-gtts' {
  interface GTTS {
    save(filepath: string, text: string, callback: (err: Error | null) => void): void
    stream(text: string): NodeJS.ReadableStream
  }
  function gtts(lang: string): GTTS
  export = gtts
}
