import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Eye, Plus, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import FormBuilder from "@/components/FormBuilder";

const CreateTrainingPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    materials: "",
    location: "",
    max_participants: 20,
    registration_deadline: "",
    status: "draft",
    type: "internal",
    external_link: ""
  });
  const [dates, setDates] = useState([{ start_datetime: "", end_datetime: "" }]);
  const [formFields, setFormFields] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const copyFrom = params.get("copyFrom");
    if (copyFrom) {
      const fetchTemplate = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`${API}/trainings/${copyFrom}`);
          const template = response.data;
           setFormData({
            title: `${template.title} (Kopie)`,
            description: template.description || "",
            requirements: template.requirements || "",
            materials: template.materials || "",
            location: template.location || "",
            max_participants: template.max_participants || 20,
            registration_deadline: template.registration_deadline ? template.registration_deadline.split('T')[0] : "",
            status: "draft",
            type: template.type || "internal",
            external_link: template.external_link || ""
          });
          if (template.dates && template.dates.length > 0) {
            const formattedDates = template.dates.map(d => ({
              start_datetime: d.start_datetime ? d.start_datetime.substring(0, 16) : "",
              end_datetime: d.end_datetime ? d.end_datetime.substring(0, 16) : ""
            }));
            setDates(formattedDates);
          }
          if (template.form_fields) {
            setFormFields(template.form_fields);
          }
          toast.success("Vorlage erfolgreich geladen!");
        } catch (error) {
          console.error("Error fetching copy template training:", error);
          toast.error("Fehler beim Laden der Vorlage");
        } finally {
          setLoading(false);
        }
      };
      fetchTemplate();
    }
  }, [location.search]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDateChange = (index, field, value) => {
    const newDates = [...dates];
    newDates[index][field] = value;
    setDates(newDates);
  };

  const addDate = () => {
    setDates([...dates, { start_datetime: "", end_datetime: "" }]);
  };

  const removeDate = (index) => {
    if (dates.length === 1) {
      toast.error("Mindestens ein Termin ist erforderlich");
      return;
    }
    const newDates = dates.filter((_, i) => i !== index);
    setDates(newDates);
  };

  const handleSubmit = async (status) => {
    const isExternal = formData.type === "external";
    
    if (isExternal) {
      if (!formData.title) {
        toast.error("Bitte geben Sie einen Titel ein");
        return;
      }
    } else {
      if (!formData.title || !formData.description || !formData.location || !formData.registration_deadline) {
        toast.error("Bitte füllen Sie alle Pflichtfelder aus");
        return;
      }
      if (dates.some(d => !d.start_datetime || !d.end_datetime)) {
        toast.error("Bitte geben Sie Start- und Enddatum für alle Termine an");
        return;
      }
    }

    const activeDates = isExternal 
      ? dates.filter(d => d.start_datetime && d.end_datetime)
      : dates;

    // Validate form fields
    if (!isExternal && formFields.length > 0) {
      const invalidFields = formFields.filter(f => !f.label || f.label.trim() === "");
      if (invalidFields.length > 0) {
        toast.error("Bitte geben Sie für alle Formularfelder eine Feldbezeichnung ein");
        return;
      }
    }

    // Validate dates plausibility
    if (formData.registration_deadline && activeDates.length > 0) {
      const registrationDeadline = new Date(formData.registration_deadline + "T23:59:59");
      
      for (let i = 0; i < activeDates.length; i++) {
        const startDate = new Date(activeDates[i].start_datetime);
        const endDate = new Date(activeDates[i].end_datetime);
        
        // Check if end is after start
        if (endDate <= startDate) {
          toast.error(`Termin ${i + 1}: Das Enddatum muss nach dem Startdatum liegen`);
          return;
        }
        
        // Check if registration deadline is before or equal to start
        if (registrationDeadline > startDate) {
          toast.error(`Termin ${i + 1}: Die Anmeldefrist muss vor oder gleich dem Startdatum liegen`);
          return;
        }
      }
    } else if (activeDates.length > 0) {
      for (let i = 0; i < activeDates.length; i++) {
        const startDate = new Date(activeDates[i].start_datetime);
        const endDate = new Date(activeDates[i].end_datetime);
        if (endDate <= startDate) {
          toast.error(`Termin ${i + 1}: Das Enddatum muss nach dem Startdatum liegen`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      await axios.post(`${API}/trainings`, {
        ...formData,
        dates: activeDates.map(d => ({
          start_datetime: d.start_datetime,
          end_datetime: d.end_datetime
        })),
        form_fields: isExternal ? [] : formFields,
        status
      });
      toast.success(`Fortbildung erfolgreich ${status === "draft" ? "als Entwurf gespeichert" : "veröffentlicht"}`);
      navigate("/my-trainings");
    } catch (error) {
      console.error("Error creating training:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Erstellen der Fortbildung");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="create-training-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Neue Fortbildung erstellen</h1>
          <p className="text-slate-600 mt-2">Erstellen Sie ein neues Fortbildungsangebot</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Grundinformationen</CardTitle>
            <CardDescription>Geben Sie die Details Ihrer Fortbildung an</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Veranstaltungstyp</Label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="type-select"
                >
                  <option value="internal">Interne Fortbildung (mit Anmeldung & Urkunde)</option>
                  <option value="external">Hinweis auf externe Veranstaltung (mit Link)</option>
                </select>
              </div>

              {formData.type === "external" && (
                <div className="space-y-2">
                  <Label htmlFor="external_link">Externer Anmeldelink</Label>
                  <Input
                    id="external_link"
                    name="external_link"
                    placeholder="https://anmeldung.externe-seite.de/..."
                    value={formData.external_link || ""}
                    onChange={handleChange}
                    data-testid="external-link-input"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                name="title"
                placeholder="z.B. Digitale Medien im Unterricht"
                value={formData.title}
                onChange={handleChange}
                data-testid="title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung {formData.type === "internal" ? "*" : ""}</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Beschreiben Sie den Inhalt und die Ziele der Fortbildung..."
                rows={4}
                value={formData.description}
                onChange={handleChange}
                data-testid="description-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requirements">Voraussetzungen</Label>
                <Textarea
                  id="requirements"
                  name="requirements"
                  placeholder="Erforderliche Vorkenntnisse..."
                  rows={3}
                  value={formData.requirements}
                  onChange={handleChange}
                  data-testid="requirements-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="materials">Mitzubringen</Label>
                <Textarea
                  id="materials"
                  name="materials"
                  placeholder="Laptop, Notizen, etc..."
                  rows={3}
                  value={formData.materials}
                  onChange={handleChange}
                  data-testid="materials-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ort {formData.type === "internal" ? "*" : ""}</Label>
              <Input
                id="location"
                name="location"
                placeholder="z.B. Raum 101, Hauptgebäude"
                value={formData.location}
                onChange={handleChange}
                data-testid="location-input"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Termine {formData.type === "internal" ? "*" : ""}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addDate}
                  className="border-blue-200 text-blue-700"
                  data-testid="add-date-button"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Termin hinzufügen
                </Button>
              </div>
              {dates.map((date, index) => (
                <Card key={index} className="p-4 bg-slate-50 border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">Termin {index + 1}</p>
                    {dates.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeDate(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`start_${index}`}>Start</Label>
                      <Input
                        id={`start_${index}`}
                        type="datetime-local"
                        value={date.start_datetime}
                        onChange={(e) => handleDateChange(index, "start_datetime", e.target.value)}
                        data-testid={`start-datetime-input-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end_${index}`}>Ende</Label>
                      <Input
                        id={`end_${index}`}
                        type="datetime-local"
                        value={date.end_datetime}
                        onChange={(e) => handleDateChange(index, "end_datetime", e.target.value)}
                        data-testid={`end-datetime-input-${index}`}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.type === "internal" && (
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Maximale Teilnehmerzahl *</Label>
                  <Input
                    id="max_participants"
                    name="max_participants"
                    type="number"
                    min="1"
                    value={formData.max_participants}
                    onChange={handleChange}
                    data-testid="max-participants-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="registration_deadline">Anmeldefrist {formData.type === "internal" ? "*" : ""}</Label>
                <Input
                  id="registration_deadline"
                  name="registration_deadline"
                  type="date"
                  value={formData.registration_deadline}
                  onChange={handleChange}
                  data-testid="registration-deadline-input"
                />
              </div>
            </div>

            {formData.type === "internal" && (
              <div className="pt-4 border-t border-slate-200">
                <FormBuilder fields={formFields} onChange={setFormFields} />
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-slate-200">
              <Button
                onClick={() => handleSubmit("draft")}
                disabled={loading}
                variant="outline"
                className="flex-1"
                data-testid="save-draft-button"
              >
                <Save className="w-4 h-4 mr-2" />
                Als Entwurf speichern
              </Button>
              <Button
                onClick={() => handleSubmit("published")}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="publish-button"
              >
                <Eye className="w-4 h-4 mr-2" />
                Veröffentlichen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateTrainingPage;
