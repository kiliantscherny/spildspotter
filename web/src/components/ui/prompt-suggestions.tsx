interface PromptSuggestionsProps {
  label: string
  append: (message: { role: "user"; content: string }) => void
  suggestions: string[]
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
}: PromptSuggestionsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-center text-2xl font-bold">{label}</h2>
      <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-6 text-sm">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => append({ role: "user", content: suggestion })}
            className="h-max rounded-xl border bg-background p-3 sm:p-4 hover:bg-muted sm:flex-1 text-left"
          >
            <p>{suggestion}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
