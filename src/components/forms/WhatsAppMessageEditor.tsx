import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  Video,
  FileText,
  Trash2,
  Plus,
  GripVertical,
  Play,
  Pause,
  Upload,
  Type,
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { WhatsAppMessage, WhatsAppMessageItem } from '@/types';

interface WhatsAppMessageEditorProps {
  value: WhatsAppMessage | undefined;
  onChange: (message: WhatsAppMessage) => void;
  availableVariables?: string[];
}

const AVAILABLE_VARIABLES = [
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

const WhatsAppMessageEditor: React.FC<WhatsAppMessageEditorProps> = ({
  value,
  onChange,
  availableVariables,
}) => {
  const { isUploading, uploadAudio, uploadVideo, uploadDocument } = useFileUpload();
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const items = value?.items || [];

  const addItem = (type: WhatsAppMessageItem['type'], content: string = '', filename?: string, mimeType?: string) => {
    const newItem: WhatsAppMessageItem = {
      id: Date.now().toString(),
      type,
      content,
      filename,
      mimeType,
    };
    onChange({
      ...value,
      items: [...items, newItem],
    });
  };

  const updateItem = (id: string, updates: Partial<WhatsAppMessageItem>) => {
    onChange({
      ...value,
      items: items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const removeItem = (id: string) => {
    onChange({
      ...value,
      items: items.filter((item) => item.id !== id),
    });
  };

  const insertVariable = (itemId: string, variable: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item && item.type === 'text') {
      updateItem(itemId, { content: item.content + `{{${variable}}}` });
    }
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        // Upload the audio
        const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        const result = await uploadAudio(file);
        if (result) {
          addItem('audio', result.url, result.original_filename, 'audio/webm');
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // File Uploads
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await uploadVideo(file);
    if (result) {
      addItem('video', result.url, result.original_filename, file.type);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await uploadDocument(file);
    if (result) {
      addItem('document', result.url, result.original_filename, file.type);
    }
  };

  const getTypeLabel = (type: WhatsAppMessageItem['type']) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'audio': return 'Áudio';
      case 'video': return 'Vídeo';
      case 'document': return 'Documento';
    }
  };

  const getTypeIcon = (type: WhatsAppMessageItem['type']) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Mensagem de WhatsApp</Label>
        <Badge variant="outline">{items.length} item(s)</Badge>
      </div>

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem('text', '')}
        >
          <Type className="mr-2 h-4 w-4" />
          Texto
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
        >
          {isRecording ? (
            <>
              <MicOff className="mr-2 h-4 w-4 text-destructive" />
              Parar Gravação
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              Gravar Áudio
            </>
          )}
        </Button>
        <label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            asChild
          >
            <span>
              <Video className="mr-2 h-4 w-4" />
              Vídeo
            </span>
          </Button>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
          />
        </label>
        <label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            asChild
          >
            <span>
              <FileText className="mr-2 h-4 w-4" />
              Documento
            </span>
          </Button>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            className="hidden"
            onChange={handleDocumentUpload}
          />
        </label>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <span className="animate-pulse h-3 w-3 rounded-full bg-destructive" />
          <span className="text-sm font-medium text-destructive">Gravando áudio...</span>
        </div>
      )}

      {/* Message items */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={item.id} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="cursor-move text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <Badge variant="secondary">{getTypeLabel(item.type)}</Badge>
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {item.type === 'text' && (
                    <div className="space-y-2">
                      <Textarea
                        value={item.content}
                        onChange={(e) => updateItem(item.id, { content: e.target.value })}
                        placeholder="Digite sua mensagem..."
                        rows={3}
                      />
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-2">Variáveis:</span>
                        {AVAILABLE_VARIABLES.map((v) => (
                          <Button
                            key={v.key}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => insertVariable(item.id, v.key)}
                          >
                            {`{{${v.key}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.type === 'audio' && (
                    <div className="flex items-center gap-3">
                      <audio controls src={item.content} className="flex-1 h-10" />
                      <span className="text-xs text-muted-foreground">{item.filename}</span>
                    </div>
                  )}

                  {item.type === 'video' && (
                    <div className="space-y-2">
                      <video controls src={item.content} className="max-w-full max-h-48 rounded" />
                      <span className="text-xs text-muted-foreground">{item.filename}</span>
                    </div>
                  )}

                  {item.type === 'document' && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.filename}</p>
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Visualizar arquivo
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <p>Nenhum conteúdo adicionado</p>
            <p className="text-sm">Use os botões acima para adicionar texto, áudio, vídeo ou documentos</p>
          </div>
        )}
      </div>

      {/* Delay setting */}
      <div className="space-y-2">
        <Label htmlFor="delay">Delay entre mensagens (segundos)</Label>
        <Input
          id="delay"
          type="number"
          min="0"
          max="60"
          value={value?.delay_seconds || 2}
          onChange={(e) => onChange({ ...value, items, delay_seconds: parseInt(e.target.value) || 2 })}
          className="w-32"
        />
      </div>
    </div>
  );
};

export default WhatsAppMessageEditor;
