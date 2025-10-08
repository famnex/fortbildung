import { useState } from "react";
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
import { useNavigate } from "react-router-dom";
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
    status: "draft"
  });
  const [dates, setDates] = useState([{ start_datetime: "", end_datetime: "" }]);
  const [formFields, setFormFields] = useState([]);

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
    if (!formData.title || !formData.description || !formData.location || !formData.registration_deadline) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus");
      return;
    }

    if (dates.some(d => !d.start_datetime || !d.end_datetime)) {
      toast.error("Bitte geben Sie Start- und Enddatum für alle Termine an");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/trainings`, {
        ...formData,
        dates: dates.map(d => ({
          start_datetime: d.start_datetime,
          end_datetime: d.end_datetime
        })),
        form_fields: formFields,
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
              <Label htmlFor="description">Beschreibung *</Label>
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
              <Label htmlFor="location">Ort *</Label>
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
                <Label>Termine *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="registration_deadline">Anmeldefrist *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="optional_question">Optionale Frage bei Anmeldung</Label>
              <Input
                id="optional_question"
                name="optional_question"
                placeholder="z.B. Besondere Bedürfnisse oder Wünsche?"
                value={formData.optional_question}
                onChange={handleChange}
                data-testid="optional-question-input"
              />
            </div>

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
