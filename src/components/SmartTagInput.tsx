import React, { useMemo, useState } from "react";
import { Hash, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TagStat,
  formatTagDisplay,
  normalizeTagKey,
  suggestMatchingTags,
} from "@/lib/tags";
import { cn } from "@/lib/utils";

interface SmartTagInputProps {
  tags: string[];
  inputValue: string;
  onTagsChange: (tags: string[]) => void;
  onInputValueChange: (val: string) => void;
  catalog: TagStat[];
  placeholder?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
}

export function SmartTagInput({
  tags,
  inputValue,
  onTagsChange,
  onInputValueChange,
  catalog,
  placeholder = "Escribe una etiqueta (ej: Almuerzo, Viaje Belmonte)...",
  onFocus,
  className,
}: SmartTagInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!inputValue.trim() && !isFocused) return [];
    return suggestMatchingTags(inputValue, catalog, tags, 6);
  }, [inputValue, catalog, tags, isFocused]);

  const addTag = (raw: string) => {
    const clean = formatTagDisplay(raw);
    const norm = normalizeTagKey(clean);
    if (!norm) return;
    if (tags.some((t) => normalizeTagKey(t) === norm)) {
      onInputValueChange("");
      return;
    }
    onTagsChange([...tags, clean]);
    onInputValueChange("");
  };

  const removeTag = (normKey: string) => {
    onTagsChange(tags.filter((t) => normalizeTagKey(t) !== normKey));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      if (inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const hasExactSuggestion = useMemo(() => {
    const qNorm = normalizeTagKey(inputValue);
    if (!qNorm) return true;
    return (
      tags.some((t) => normalizeTagKey(t) === qNorm) ||
      suggestions.some((s) => s.normKey === qNorm)
    );
  }, [inputValue, tags, suggestions]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected chips */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const norm = normalizeTagKey(tag);
            return (
              <Badge
                key={norm}
                variant="secondary"
                className="pl-2 pr-1 py-1 text-xs font-semibold gap-1 rounded-xl bg-primary/10 text-primary border border-primary/20"
              >
                <Hash className="w-3 h-3 opacity-70" />
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(norm)}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                  aria-label={`Quitar etiqueta ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Input box */}
      <div className="relative">
        <Hash className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val.endsWith(",")) {
              addTag(val.slice(0, -1));
            } else {
              onInputValueChange(val);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 180);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="pl-9 h-12 rounded-xl"
        />
      </div>

      {/* Fuzzy suggestions + create new chip */}
      {(suggestions.length > 0 || (inputValue.trim().length > 0 && !hasExactSuggestion)) && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {suggestions.map((sug) => (
            <button
              key={sug.normKey}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(sug.name)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-muted/70 hover:bg-primary hover:text-primary-foreground border border-border/60 transition-colors"
            >
              <Hash className="w-3 h-3 opacity-60" />
              <span>{sug.name}</span>
              <span className="text-[10px] opacity-60">({sug.count})</span>
            </button>
          ))}
          {inputValue.trim().length > 0 && !hasExactSuggestion && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(inputValue)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Crear "{formatTagDisplay(inputValue)}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
