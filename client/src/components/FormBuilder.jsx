import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X, GripVertical } from "lucide-react";

const FormBuilder = ({ fields, onChange }) => {
  const [editingField, setEditingField] = useState(null);

  const addField = (type) => {
    const newField = {
      field_id: `field_${Date.now()}`,
      field_type: type,
      label: "",
      required: false,
      options: type === "multiselect" || type === "dropdown" ? [""] : []
    };
    onChange([...fields, newField]);
    setEditingField(fields.length);
  };

  const updateField = (index, updates) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    onChange(newFields);
  };

  const removeField = (index) => {
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields);
    if (editingField === index) setEditingField(null);
  };

  const addOption = (fieldIndex) => {
    const newFields = [...fields];
    newFields[fieldIndex].options.push("");
    onChange(newFields);
  };

  const updateOption = (fieldIndex, optionIndex, value) => {
    const newFields = [...fields];
    newFields[fieldIndex].options[optionIndex] = value;
    onChange(newFields);
  };

  const removeOption = (fieldIndex, optionIndex) => {
    const newFields = [...fields];
    newFields[fieldIndex].options = newFields[fieldIndex].options.filter((_, i) => i !== optionIndex);
    onChange(newFields);
  };

  const fieldTypeLabels = {
    text: "Eingabefeld",
    multiselect: "Mehrfachauswahl",
    date: "Datumsauswahl",
    dropdown: "Dropdown"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Anmeldeformular</Label>
        <div className="flex space-x-2">
          <Button type="button" size="sm" variant="outline" onClick={() => addField("text")}>
            <Plus className="w-4 h-4 mr-1" /> Eingabefeld
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addField("multiselect")}>
            <Plus className="w-4 h-4 mr-1" /> Mehrfachauswahl
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addField("date")}>
            <Plus className="w-4 h-4 mr-1" /> Datum
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addField("dropdown")}>
            <Plus className="w-4 h-4 mr-1" /> Dropdown
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-slate-500">
            Noch keine Felder vorhanden. Fügen Sie Felder hinzu, um ein Anmeldeformular zu erstellen.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.field_id} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <CardTitle className="text-sm">{fieldTypeLabels[field.field_type]}</CardTitle>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeField(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`field_label_${index}`}>Feldbezeichnung *</Label>
                  <Input
                    id={`field_label_${index}`}
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="z.B. Besondere Bedürfnisse"
                    required
                  />
                  {!field.label && (
                    <p className="text-xs text-red-600">Dieses Feld ist erforderlich</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`field_required_${index}`}
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(index, { required: checked })}
                  />
                  <Label htmlFor={`field_required_${index}`}>Pflichtfeld</Label>
                </div>

                {(field.field_type === "multiselect" || field.field_type === "dropdown") && (
                  <div className="space-y-2">
                    <Label>Auswahloptionen</Label>
                    {field.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex space-x-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, optIndex, e.target.value)}
                          placeholder={`Option ${optIndex + 1}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeOption(index, optIndex)}
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addOption(index)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Option hinzufügen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
