import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useFormBySlug } from '@/hooks/useForms';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Helper to generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const ThankYouPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { data: form, isLoading } = useFormBySlug(slug || '');

  const isEmbed = searchParams.get('embed') === '1' || searchParams.get('embed') === 'true';

  // Quiz result from URL params
  const quizResult = searchParams.get('quiz_score') ? {
    score: parseInt(searchParams.get('quiz_score') || '0'),
    total: parseInt(searchParams.get('quiz_total') || '0'),
    passed: searchParams.get('quiz_passed') === '1',
    percentage: parseFloat(searchParams.get('quiz_pct') || '0'),
  } : undefined;

  // Initialize Facebook Pixel and fire Lead event on this page
  useEffect(() => {
    if (!form?.settings?.facebook_pixel) return;

    // @ts-ignore
    if (!window.fbq) {
      // @ts-ignore
      !function(f,b,e,v,n,t,s)
      // @ts-ignore
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      // @ts-ignore
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      // @ts-ignore
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      // @ts-ignore
      n.queue=[];t=b.createElement(e);t.async=!0;
      // @ts-ignore
      t.src=v;s=b.getElementsByTagName(e)[0];
      // @ts-ignore
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');

      // @ts-ignore
      window.fbq('init', form.settings.facebook_pixel);
    }

    const eventId = generateUUID();
    // @ts-ignore
    window.fbq('track', 'PageView', {}, { eventID: eventId });

    // Fire Lead event - this is what Meta uses for conversion tracking
    const leadEventId = generateUUID();
    // @ts-ignore
    window.fbq('track', 'Lead', {
      content_name: form.name,
      content_category: 'Form Submission',
    }, { eventID: leadEventId });
  }, [form]);

  // Inject Google Tag Manager / Analytics
  useEffect(() => {
    if (!form?.settings) return;
    
    if (form.settings.google_tag_manager) {
      const script = document.createElement('script');
      script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${form.settings.google_tag_manager}');`;
      document.head.appendChild(script);
    }

    if (form.settings.google_analytics) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${form.settings.google_analytics}`;
      document.head.appendChild(script);
      const script2 = document.createElement('script');
      script2.innerHTML = `window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${form.settings.google_analytics}');
        gtag('event', 'generate_lead');`;
      document.head.appendChild(script2);
    }
  }, [form]);

  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center gap-3",
        isEmbed ? "min-h-full" : "min-h-screen"
      )}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const settings = form?.settings;
  const primaryColor = settings?.primary_color;

  return (
    <div className={cn(
      "flex items-center justify-center bg-gradient-to-br from-background to-muted p-4",
      isEmbed ? "min-h-full" : "min-h-screen"
    )}>
      <div className="text-center space-y-6">
        {settings?.logo_url && (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className="mx-auto object-contain w-auto max-w-full mb-4"
            style={{ height: `${settings.logo_size || 48}px`, minHeight: `${settings.logo_size || 48}px` }}
          />
        )}
        
        {quizResult ? (
          <div className="space-y-4 animate-in zoom-in duration-500">
            <div className={cn(
              "mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4",
              quizResult.passed ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"
            )}>
              {quizResult.passed ? (
                <Check className="h-12 w-12 text-green-600" />
              ) : (
                <span className="text-4xl font-bold text-red-500">!</span>
              )}
            </div>
            <div>
              <h1 className={cn("text-3xl font-bold", quizResult.passed ? "text-green-600" : "text-red-600")}>
                {quizResult.passed ? 'Aprovado!' : 'Reprovado'}
              </h1>
              <div className="mt-2 text-xl font-medium text-muted-foreground">
                Você fez {quizResult.score} de {quizResult.total} pontos ({Math.round(quizResult.percentage)}%)
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-8 w-8 text-primary" />
          </div>
        )}
        
        <div className="space-y-2">
          {!quizResult && <h1 className="text-2xl font-bold">Obrigado!</h1>}
          <p className="text-muted-foreground max-w-md mx-auto">
            {settings?.success_message || 'Seu cadastro foi realizado com sucesso.'}
          </p>
        </div>

        {settings?.download_button_url && (
          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={() => window.open(settings.download_button_url, '_blank')}
              className="gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <ArrowRight className="h-4 w-4" />
              {settings.download_button_text || 'Baixar Arquivo'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThankYouPage;
