import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DynamicForm = ({ fields, values, onChange }) => {
  const handleChange = (fieldId, value) => {
    onChange({
      ...values,
      [fieldId]: value
    });
  };

  const handleMultiSelectChange = (fieldId, option, checked) => {
    const currentValues = values[fieldId] || [];
    const newValues = checked
      ? [...currentValues, option]
      : currentValues.filter(v => v !== option);
    handleChange(fieldId, newValues);
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.field_id} className="space-y-2">
          <Label htmlFor={field.field_id}>
            {field.label}
            {field.required && <span className="text-red-600 ml-1">*</span>}
          </Label>

          {field.field_type === "text" && (
            <Input
              id={field.field_id}
              value={values[field.field_id] || ""}
              onChange={(e) => handleChange(field.field_id, e.target.value)}
              required={field.required}
            />
          )}

          {field.field_type === "date" && (
            <Input
              id={field.field_id}
              type="date"
              value={values[field.field_id] || ""}
              onChange={(e) => handleChange(field.field_id, e.target.value)}
              required={field.required}
            />
          )}

          {field.field_type === "dropdown" && (
            <Select
              value={values[field.field_id] || ""}
              onValueChange={(value) => handleChange(field.field_id, value)}
              required={field.required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bitte wählen..." />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.field_type === "multiselect" && (
            <div className="space-y-2 border rounded-lg p-3">
              {field.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.field_id}_${index}`}
                    checked={(values[field.field_id] || []).includes(option)}
                    onCheckedChange={(checked) => handleMultiSelectChange(field.field_id, option, checked)}
                  />
                  <Label htmlFor={`${field.field_id}_${index}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DynamicForm;
