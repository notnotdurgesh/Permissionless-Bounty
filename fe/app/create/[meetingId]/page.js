'use client'

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FileUpload from '@/components/FileUpload';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  UserCircle, 
  Briefcase, 
  Presentation,
  Bot,
  Loader2
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const INITIAL_FORM_STATE = {
  interview: {
    position: '',
    level: '',
    technicalSkills: '',
    behavioralQuestions: '',
    resume: null
  },
  personal: {
    name: '',
    place: '',
    aboutYourself: ''
  },
  presentation: {
    document: null,
    presentationNotes: ''
  },
  documents: {
    uploadedDocs: [],
    aiNotes: ''
  }
};

export default function AdvancedPrepForm() {
   
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { meetingId } = useParams()
  
  const updateFormData = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const validateSection = (section) => {
    const sectionData = formData[section];
    switch(section) {
      case 'interview':
        if (!sectionData.position || !sectionData.level || !sectionData.technicalSkills) {
          throw new Error('Please fill in all required fields in the Interview section');
        }
        break;
      case 'personal':
        if (!sectionData.name || !sectionData.aboutYourself) {
          throw new Error('Please fill in all required fields in the Personal section');
        }
        break;
      case 'presentation':
        if (!sectionData.document) {
          throw new Error('Please upload a presentation document');
        }
        break;
      case 'documents':
        if (!sectionData.uploadedDocs.length) {
          throw new Error('Please upload at least one document for analysis');
        }
        break;
    }
  };

  const handleSubmit = async (section) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      validateSection(section);
      const sectionData = formData[section];
      
      // Create context for API call
      const contextData = {
        section,
        meetingId: meetingId,
        context: sectionData,
      };

      console.log('Submitting data:', contextData);
      sessionStorage.setItem('userData', JSON.stringify(contextData)); 
      router.push(`/meet`)

      setSuccess(`Successfully submitted ${section} information!`);
    } catch (error) {
      setError(error.message);
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (section, icon, title, color, children) => (
    <AccordionItem value={section} className="border rounded-lg bg-white shadow-sm">
      <AccordionTrigger className="px-6 py-4 hover:bg-slate-50 transition-all">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-4 pt-4">
            {children}
            <Button 
              onClick={() => handleSubmit(section)}
              className={`w-full ${color}`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : `Submit ${title}`}
            </Button>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900">
            Interview & Presentation Assistant
          </h1>
          <p className="text-slate-600">
            Select a category below to begin your preparation
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Accordion type="single" collapsible className="space-y-4">
          {renderSection(
            'interview',
            <Briefcase className="w-5 h-5 text-blue-600" />,
            'Interview Preparation',
            'bg-blue-600 hover:bg-blue-700',
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position/Role *</Label>
                  <Input
                    placeholder="e.g., Software Engineer"
                    value={formData.interview.position}
                    onChange={(e) => updateFormData('interview', 'position', e.target.value)}
                    className="border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Experience Level *</Label>
                  <Select 
                    onValueChange={(value) => updateFormData('interview', 'level', value)}
                    value={formData.interview.level}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Technical Skills Required *</Label>
                <Textarea
                  placeholder="Required programming languages, frameworks, etc."
                  value={formData.interview.technicalSkills}
                  onChange={(e) => updateFormData('interview', 'technicalSkills', e.target.value)}
                  className="min-h-[100px] border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <FileUpload
                  accept=".pdf,.doc,.docx"
                  multiple={false}
                  label="Resume Upload"
                  hint="Drag and drop your resume here, or click to select"
                  onFileUpload={(fileData) => updateFormData('interview', 'resume', fileData)}
                />
              </div>
            </>
          )}

          {renderSection(
            'personal',
            <UserCircle className="w-5 h-5 text-green-600" />,
            'Causal Talk',
            'bg-green-600 hover:bg-green-700',
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Your name"
                    value={formData.personal.name}
                    onChange={(e) => updateFormData('personal', 'name', e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Your location"
                    value={formData.personal.place}
                    onChange={(e) => updateFormData('personal', 'place', e.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>About Yourself *</Label>
                <Textarea
                  placeholder="Tell us about yourself..."
                  value={formData.personal.aboutYourself}
                  onChange={(e) => updateFormData('personal', 'aboutYourself', e.target.value)}
                  className="min-h-[100px] border-slate-200"
                />
              </div>
            </>
          )}

          {renderSection(
            'presentation',
            <Presentation className="w-5 h-5 text-purple-600" />,
            'Document Presentation',
            'bg-purple-600 hover:bg-purple-700',
            <>
              <div className="space-y-2">
                <FileUpload
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  multiple={false}
                  label="Upload Presentation Document"
                  hint="Drag and drop your presentation here, or click to select"
                  onFileUpload={(fileData) => updateFormData('presentation', 'document', fileData)}
                />
              </div>

              <div className="space-y-2">
                <Label>Presentation Notes</Label>
                <Textarea
                  placeholder="Add any specific focus areas or notes for your presentation..."
                  value={formData.presentation.presentationNotes}
                  onChange={(e) => updateFormData('presentation', 'presentationNotes', e.target.value)}
                  className="min-h-[100px] border-slate-200"
                />
              </div>
            </>
          )}

          {renderSection(
            'documents',
            <Bot className="w-5 h-5 text-orange-600" />,
            'AI Document Analysis',
            'bg-orange-600 hover:bg-orange-700',
            <>
              <div className="space-y-2">
                <FileUpload
                  accept=".pdf,.doc,.docx,.txt"
                  multiple={true}
                  label="Upload Documents for Analysis"
                  hint="Drag and drop multiple documents here, or click to select"
                  onFileUpload={(fileData) => {
                    const currentDocs = formData.documents.uploadedDocs || [];
                    updateFormData('documents', 'uploadedDocs', [...currentDocs, fileData]);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>AI Analysis Focus</Label>
                <Textarea
                  placeholder="Specify what aspects you'd like the AI to analyze..."
                  value={formData.documents.aiNotes}
                  onChange={(e) => updateFormData('documents', 'aiNotes', e.target.value)}
                  className="min-h-[100px] border-slate-200"
                />
              </div>
            </>
          )}
        </Accordion>
      </div>
    </div>
  );
}