import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Filter, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterField {
  name: string;
  prompt: string;
  type: string;
  operator: string;
  input_type: string;
  cache_duration?: number;
}

interface FilterValues {
  [key: string]: string;
}

interface FilterPanelProps {
  fields: FilterField[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  onRefreshDropdowns: () => void;
  dropdownOptions: { [key: string]: string[] };
  loadingDropdowns: { [key: string]: boolean };
}

export function FilterPanel({
  fields,
  values,
  onValuesChange,
  onRefreshDropdowns,
  dropdownOptions,
  loadingDropdowns
}: FilterPanelProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    const active = Object.entries(values)
      .filter(([_, value]) => value.trim() !== "")
      .map(([key, _]) => key);
    setActiveFilters(active);
  }, [values]);

  const updateValue = (fieldName: string, value: string) => {
    onValuesChange({ ...values, [fieldName]: value });
  };

  const clearValue = (fieldName: string) => {
    updateValue(fieldName, "");
  };

  const clearAllFilters = () => {
    const clearedValues = Object.keys(values).reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {} as FilterValues);
    onValuesChange(clearedValues);
  };

  if (fields.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No filters configured for this job</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card hover-glow">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <CardTitle>Data Filters</CardTitle>
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilters.length} active
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshDropdowns}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground mb-4">
          Leave fields empty to skip filtering on those criteria
        </div>

        <div className="grid gap-6">
          {fields.map((field, index) => (
            <div
              key={field.name}
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.prompt}
                </Label>
                {values[field.name] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearValue(field.name)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {field.input_type === "dropdown" ? (
                <DropdownFilter
                  field={field}
                  value={values[field.name] || ""}
                  onChange={(value) => updateValue(field.name, value)}
                  options={dropdownOptions[field.name] || []}
                  loading={loadingDropdowns[field.name] || false}
                />
              ) : field.input_type === "calendar" && field.type === "date" ? (
                <DateFilter
                  field={field}
                  value={values[field.name] || ""}
                  onChange={(value) => updateValue(field.name, value)}
                />
              ) : (
                <TextFilter
                  field={field}
                  value={values[field.name] || ""}
                  onChange={(value) => updateValue(field.name, value)}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DropdownFilter({
  field,
  value,
  onChange,
  options,
  loading
}: {
  field: FilterField;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  loading: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 bg-background/50 border-border/50 focus:bg-background transition-all duration-300">
        <SelectValue placeholder={loading ? "Loading..." : "Select an option..."} />
      </SelectTrigger>
      <SelectContent className="glass-card border-border/50 max-h-60">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading options...
          </div>
        ) : options.length > 0 ? (
          options.map((option) => (
            <SelectItem key={option} value={option} className="hover:bg-accent/50">
              {option}
            </SelectItem>
          ))
        ) : (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No options available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

function DateFilter({
  field,
  value,
  onChange
}: {
  field: FilterField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [date, setDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    onChange(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-12 justify-start text-left font-normal bg-background/50 border-border/50 focus:bg-background transition-all duration-300",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 glass-card border-border/50" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function TextFilter({
  field,
  value,
  onChange
}: {
  field: FilterField;
  value: string;
  onChange: (value: string) => void;
}) {
  const placeholder = field.type === "date" 
    ? "YYYY-MM-DD" 
    : `Enter ${field.name.toLowerCase()}...`;

  return (
    <Input
      type={field.type === "number" ? "number" : "text"}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 bg-background/50 border-border/50 focus:bg-background transition-all duration-300"
    />
  );
}