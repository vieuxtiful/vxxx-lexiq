import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LANGUAGES, LANGUAGE_FAMILIES, Language } from "@/lib/languageData";

interface LanguageComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LanguageCombobox({
  value,
  onValueChange,
  placeholder = "Select language...",
  className,
}: LanguageComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLanguage = LANGUAGES.find((lang) => lang.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedLanguage ? (
            <span className="flex items-center gap-2">
              <span>{selectedLanguage.flag}</span>
              <span>{selectedLanguage.name}</span>
              <span className="text-muted-foreground text-xs">({selectedLanguage.code})</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search languages..." />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            {Object.entries(LANGUAGE_FAMILIES).map(([family, codes]) => {
              const familyLanguages = LANGUAGES.filter((lang) =>
                codes.includes(lang.code)
              );
              
              if (familyLanguages.length === 0) return null;

              return (
                <CommandGroup key={family} heading={family}>
                  {familyLanguages.map((lang) => (
                    <CommandItem
                      key={lang.code}
                      value={`${lang.name} ${lang.nativeName} ${lang.code}`}
                      onSelect={() => {
                        onValueChange(lang.code);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === lang.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="mr-2">{lang.flag}</span>
                      <div className="flex flex-col">
                        <span>{lang.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {lang.nativeName} • {lang.code}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
