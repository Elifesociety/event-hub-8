import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Video, Image, FileText, GripVertical, Upload, Loader2 } from 'lucide-react';

interface SurveyContent {
  id: string;
  content_type: string;
  title: string;
  content_url: string | null;
  content_text: string | null;
  display_order: number;
  is_active: boolean;
}

type ContentType = 'video' | 'poster' | 'writeup';

export function SurveyContentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentType>('video');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    content_url: '',
    content_text: '',
  });

  const { data: contents, isLoading } = useQuery({
    queryKey: ['survey-content', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_content')
        .select('*')
        .eq('content_type', activeTab)
        .order('display_order');
      if (error) throw error;
      return data as SurveyContent[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: { title: string; content_url?: string; content_text?: string; content_type: string }) => {
      const maxOrder = contents?.reduce((max, c) => Math.max(max, c.display_order), 0) || 0;
      const { error } = await supabase
        .from('survey_content')
        .insert({ 
          ...content, 
          display_order: maxOrder + 1,
          content_url: content.content_url || null,
          content_text: content.content_text || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-content', activeTab] });
      setFormData({ title: '', content_url: '', content_text: '' });
      setIsAddOpen(false);
      setUploadMode('url');
      toast({ title: 'Content added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding content', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('survey_content')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-content', activeTab] });
      toast({ title: 'Content updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating content', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('survey_content')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-content', activeTab] });
      toast({ title: 'Content deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting content', description: error.message, variant: 'destructive' });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type for posters
    if (activeTab === 'poster' && !file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File size must be less than 10MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${activeTab}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('survey-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('survey-content')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, content_url: publicUrl }));
      toast({ title: 'File uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAdd = () => {
    if (!formData.title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }
    if (activeTab !== 'writeup' && !formData.content_url.trim()) {
      toast({ title: 'Please enter a URL or upload a file', variant: 'destructive' });
      return;
    }
    if (activeTab === 'writeup' && !formData.content_text.trim()) {
      toast({ title: 'Please enter content text', variant: 'destructive' });
      return;
    }

    addMutation.mutate({
      title: formData.title.trim(),
      content_url: formData.content_url.trim() || undefined,
      content_text: formData.content_text.trim() || undefined,
      content_type: activeTab,
    });
  };

  const getIcon = (type: ContentType) => {
    switch (type) {
      case 'video': return Video;
      case 'poster': return Image;
      case 'writeup': return FileText;
    }
  };

  const ContentIcon = getIcon(activeTab);

  const resetAndOpenDialog = () => {
    setFormData({ title: '', content_url: '', content_text: '' });
    setUploadMode('url');
    setIsAddOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ContentIcon className="h-5 w-5" />
          View Page Content
        </CardTitle>
        <CardDescription>Manage videos, posters, and writeups for the survey view page</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="video" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="poster" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                Posters
              </TabsTrigger>
              <TabsTrigger value="writeup" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                Writeups
              </TabsTrigger>
            </TabsList>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetAndOpenDialog} size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter title"
                    />
                  </div>
                  {activeTab !== 'writeup' && (
                    <>
                      {activeTab === 'poster' && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={uploadMode === 'url' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setUploadMode('url')}
                          >
                            URL
                          </Button>
                          <Button
                            type="button"
                            variant={uploadMode === 'file' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setUploadMode('file')}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </Button>
                        </div>
                      )}
                      
                      {(uploadMode === 'url' || activeTab === 'video') && (
                        <div>
                          <Label htmlFor="url">
                            {activeTab === 'video' ? 'Video URL (YouTube, etc.)' : 'Image URL'}
                          </Label>
                          <Input
                            id="url"
                            value={formData.content_url}
                            onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                            placeholder={activeTab === 'video' ? 'https://youtube.com/...' : 'https://...'}
                          />
                        </div>
                      )}
                      
                      {uploadMode === 'file' && activeTab === 'poster' && (
                        <div className="space-y-2">
                          <Label>Upload Image</Label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            {formData.content_url ? (
                              <div className="space-y-2">
                                <img 
                                  src={formData.content_url} 
                                  alt="Preview" 
                                  className="max-h-32 mx-auto rounded"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isUploading}
                                >
                                  Change Image
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Select Image
                                  </>
                                )}
                              </Button>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Max file size: 10MB
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {activeTab === 'writeup' && (
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content_text}
                        onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                        placeholder="Enter writeup content"
                        rows={6}
                      />
                    </div>
                  )}
                  <Button 
                    onClick={handleAdd} 
                    disabled={addMutation.isPending || isUploading} 
                    className="w-full"
                  >
                    {addMutation.isPending ? 'Adding...' : 'Add Content'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : contents && contents.length > 0 ? (
              <div className="space-y-4">
                {contents.map((content) => (
                  <Card key={content.id} className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">{content.title}</h4>
                          {content.content_url && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {content.content_url}
                            </p>
                          )}
                          {content.content_text && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {content.content_text}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-8 sm:pl-0">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${content.id}`} className="text-xs sm:text-sm">Active</Label>
                          <Switch
                            id={`active-${content.id}`}
                            checked={content.is_active}
                            onCheckedChange={(is_active) => updateMutation.mutate({ id: content.id, is_active })}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(content.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No {activeTab}s added yet. Click "Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}" to get started.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}