import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Copy, Check, Share2 } from "lucide-react";

export function SurveyCreate() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    panchayath: "",
    ward: ""
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateLink = () => {
    if (!formData.name || !formData.mobile || !formData.panchayath || !formData.ward) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to generate the link.",
        variant: "destructive"
      });
      return;
    }

    // Create the view page URL with query params
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      name: formData.name.trim(),
      mobile: formData.mobile.trim(),
      panchayath: formData.panchayath.trim(),
      ward: formData.ward.trim()
    });
    const viewUrl = `${baseUrl}/survey-view?${params.toString()}`;
    
    setGeneratedLink(viewUrl);
    
    toast({
      title: "Link Generated!",
      description: "Your survey link has been created successfully."
    });
  };

  const getWhatsAppLink = () => {
    const message = encodeURIComponent(
      `🎉 Check out our event!\n\n` +
      `👤 Shared by: ${formData.name}\n` +
      `📍 ${formData.panchayath}, Ward ${formData.ward}\n\n` +
      `View details here:\n${generatedLink}`
    );
    return `https://wa.me/?text=${message}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Create Survey Link
          </CardTitle>
          <CardDescription>
            Fill in your details to generate a personalized WhatsApp share link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              placeholder="Enter your mobile number"
              value={formData.mobile}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="panchayath">Panchayath</Label>
            <Input
              id="panchayath"
              name="panchayath"
              placeholder="Enter your panchayath name"
              value={formData.panchayath}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ward">Ward</Label>
            <Input
              id="ward"
              name="ward"
              placeholder="Enter your ward number/name"
              value={formData.ward}
              onChange={handleInputChange}
            />
          </div>
          
          <Button onClick={generateLink} className="w-full">
            Generate Link
          </Button>
          
          {generatedLink && (
            <div className="mt-6 space-y-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Generated Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button
                asChild
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share on WhatsApp
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
