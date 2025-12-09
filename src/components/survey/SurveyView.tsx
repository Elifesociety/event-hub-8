import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Video, Image, FileText } from "lucide-react";

export function SurveyView() {
  return (
    <div className="space-y-8">
      {/* Video Ad Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video Advertisement
          </CardTitle>
          <CardDescription>
            Watch our promotional video
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-center space-y-2">
                <Video className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Video content will be displayed here
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload your promotional video to showcase
                </p>
              </div>
            </div>
          </AspectRatio>
        </CardContent>
      </Card>

      {/* Poster Ad Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Poster Gallery
          </CardTitle>
          <CardDescription>
            View our event posters and promotional materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((index) => (
              <AspectRatio key={index} ratio={3 / 4} className="bg-muted rounded-lg overflow-hidden">
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-accent/10 to-accent/5">
                  <div className="text-center space-y-2">
                    <Image className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Poster {index}
                    </p>
                  </div>
                </div>
              </AspectRatio>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Write-ups Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Campaign Write-ups
          </CardTitle>
          <CardDescription>
            Learn more about our event and initiatives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-sm max-w-none">
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Welcome to Our Grand Event!
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                We are excited to invite you to our upcoming celebration! This event promises to be a memorable experience 
                filled with entertainment, food, and community spirit. Join us as we come together to celebrate our 
                traditions and create lasting memories.
              </p>
              
              <h4 className="text-md font-semibold text-foreground mt-4">
                Event Highlights
              </h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Cultural performances and entertainment</li>
                <li>Delicious food from various stalls</li>
                <li>Games and activities for all ages</li>
                <li>Special programs and ceremonies</li>
                <li>Community gathering and networking</li>
              </ul>
              
              <h4 className="text-md font-semibold text-foreground mt-4">
                Why Participate?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                This is more than just an event – it's a celebration of our community's unity and strength. 
                Whether you're joining as a visitor, volunteer, or stall owner, your participation makes this 
                event special. Together, we create moments that bring joy to everyone.
              </p>
              
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-foreground font-medium">
                  📅 Don't miss out! Mark your calendars and join us for an unforgettable experience.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
