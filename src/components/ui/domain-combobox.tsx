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
import { DOMAINS, DOMAIN_CATEGORIES, Domain } from "@/lib/domainData";

interface DomainComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DomainCombobox({
  value,
  onValueChange,
  placeholder = "Select domain...",
  className,
}: DomainComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDomain = DOMAINS.find((domain) => domain.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedDomain ? (
            <span className="flex items-center gap-2">
              <selectedDomain.icon className={cn("h-4 w-4", selectedDomain.color)} />
              <span>{selectedDomain.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search domains..." />
          <CommandList>
            <CommandEmpty>No domain found.</CommandEmpty>
            {Object.entries(DOMAIN_CATEGORIES).map(([categoryKey, categoryData]) => {
              if (categoryData.domains.length === 0) return null;

              return (
                <CommandGroup key={categoryKey} heading={categoryData.label}>
                  {categoryData.domains.map((domain) => (
                    <CommandItem
                      key={domain.id}
                      value={`${domain.name} ${domain.description}`}
                      onSelect={() => {
                        onValueChange(domain.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === domain.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <domain.icon className={cn("h-4 w-4 mr-2", domain.color)} />
                      <div className="flex flex-col">
                        <span>{domain.name}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {domain.description}
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
