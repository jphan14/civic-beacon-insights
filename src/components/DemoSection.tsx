import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import React from "react";

const VIDEO_ID = "HGhimKHoxMg";
const YT_WATCH_URL = `https://youtu.be/${VIDEO_ID}`;
const YT_EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}`;
const THUMBNAIL_URL = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`;

const DemoSection: React.FC = () => {
  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Product Demo: See the Tool in Action",
    description:
      "Watch a quick demo showcasing how this tool summarizes meetings and helps you explore decisions fast.",
    thumbnailUrl: [THUMBNAIL_URL],
    contentUrl: YT_WATCH_URL,
    embedUrl: YT_EMBED_URL,
    uploadDate: "2024-01-01T00:00:00Z",
  };

  return (
    <section id="demo" aria-labelledby="demo-heading" className="bg-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <header className="mb-6 md:mb-8">
          <h2 id="demo-heading" className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Product Demo: See the Tool in Action
          </h2>
          <p className="mt-2 text-muted-foreground max-w-3xl">
            Explore the key features and how it works in practice. This short video walks through summarizing
            meetings, searching by topic, and reviewing decisions quickly.
          </p>
        </header>

        <Card className="border">
          <CardHeader className="pb-0">
            <CardTitle className="text-base md:text-lg text-foreground">Watch the demo</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Learn how to navigate the interface and get the most out of the summaries and search.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <AspectRatio ratio={16 / 9}>
              <iframe
                src={`${YT_EMBED_URL}?rel=0`}
                title="Product Demo"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="h-full w-full rounded-md border"
              />
            </AspectRatio>
          </CardContent>
        </Card>

        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
      </div>
    </section>
  );
};

export default DemoSection;
