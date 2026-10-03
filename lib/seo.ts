import type { Metadata } from "next";

import {
  defaultLocale,
  localeTags,
  locales,
  ogLocales,
  type Locale,
} from "@/lib/i18n";

/** Canonical origin. Override with NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ronascorduene.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Ronas Corduene";

export const OG_IMAGE = "/og-image.jpg";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const BUSINESS = {
  email: "hello@ronascorduene.com",
  instagram: "https://www.instagram.com/ronascorduene",
  locality: "Corduene",
  country: "TR",
} as const;

export type PageKey =
  | "home"
  | "about"
  | "initiative"
  | "store"
  | "contact"
  | "list";

type PageSeo = {
  /** Path after the locale segment, "" for the home page. */
  path: string;
  title: string;
  description: string;
};

type LocaleSeo = {
  keywords: string[];
  pages: Record<PageKey, PageSeo>;
};

/**
 * Localised, keyword-focused SEO copy for a performance & body-kit workshop
 * based in Turkey and serving the Middle East.
 */
export const SEO: Record<Locale, LocaleSeo> = {
  en: {
    keywords: [
      "performance parts Turkey",
      "body kits Middle East",
      "car tuning workshop",
      "carbon fiber aero",
      "cold air intake",
      "exhaust manifold",
      "forged wheels",
      "custom car parts",
      "Ronas Corduene",
    ],
    pages: {
      home: {
        path: "",
        title:
          "Ronas Corduene — Performance Parts & Body Kits in Turkey & the Middle East",
        description:
          "Performance parts, carbon fibre aero and body kits engineered in Turkey and shipped across the Middle East. Air intakes, exhaust manifolds, forged wheels and styling built for the drive.",
      },
      about: {
        path: "/about",
        title: "About Ronas Corduene | Performance & Body Kit Workshop",
        description:
          "Ronas Corduene is a performance and body-kit workshop in Turkey serving the Middle East. Discover the engineering, design and character behind every component we build.",
      },
      store: {
        path: "/store",
        title: "Store — Performance Parts & Body Kits | Ronas Corduene",
        description:
          "Browse the Ronas Corduene catalog: cold air intakes, exhaust manifolds, carbon fibre aero, body kits and forged wheels engineered for the road.",
      },
      contact: {
        path: "/contact",
        title: "Contact Ronas Corduene | Performance Workshop in Turkey",
        description:
          "Get in touch with Ronas Corduene for performance parts, body kits and custom builds. Based in Turkey and serving the Middle East.",
      },
      list: {
        path: "/list",
        title: "Your Parts List | Ronas Corduene",
        description:
          "Build your parts list and send it to Ronas Corduene. We confirm availability, fitment and delivery for performance parts and body kits.",
      },
      initiative: {
        path: "/initiative",
        title:
          "Our Initiative | Leftover Materials into Animal Mobility — Ronas Corduene",
        description:
          "Ronas Corduene turns production leftovers and material scraps into mobility equipment for stray animals — animal wheelchairs, mobility aids and custom support built with the same engineering as our performance parts.",
      },
    },
  },
  tr: {
    keywords: [
      "performans parçaları Türkiye",
      "body kit Orta Doğu",
      "araç modifiye atölyesi",
      "karbon fiber aero",
      "soğuk hava emiş",
      "egzoz manifoldu",
      "dövme jant",
      "özel araç parçaları",
      "Ronas Corduene",
    ],
    pages: {
      home: {
        path: "",
        title:
          "Ronas Corduene — Türkiye ve Orta Doğu için Performans Parçaları ve Body Kit",
        description:
          "Türkiye'de üretilen performans parçaları, karbon fiber aero ve body kitler; Orta Doğu'ya sunulur. Hava emiş, egzoz manifoldu, dövme jant ve stil çözümleri.",
      },
      about: {
        path: "/about",
        title: "Ronas Corduene Hakkında | Performans ve Body Kit Atölyesi",
        description:
          "Ronas Corduene, Orta Doğu'ya hizmet veren Türkiye merkezli bir performans ve body kit atölyesidir. Ürettiğimiz her parçanın mühendisliğini ve tasarımını keşfedin.",
      },
      store: {
        path: "/store",
        title: "Mağaza — Performans Parçaları ve Body Kit | Ronas Corduene",
        description:
          "Ronas Corduene kataloğunu keşfedin: soğuk hava emişleri, egzoz manifoldları, karbon fiber aero, body kitler ve dövme jantlar.",
      },
      contact: {
        path: "/contact",
        title: "İletişim | Türkiye'de Performans Atölyesi",
        description:
          "Performans parçaları, body kitler ve özel projeler için Ronas Corduene ile iletişime geçin. Türkiye merkezli, Orta Doğu'ya hizmet verir.",
      },
      list: {
        path: "/list",
        title: "Parça Listeniz | Ronas Corduene",
        description:
          "Parça listenizi oluşturun ve Ronas Corduene'e gönderin. Stok, uyum ve teslimatı sizin için teyit ediyoruz.",
      },
      initiative: {
        path: "/initiative",
        title:
          "İnisiyatifimiz | Üretim Artıklarından Hayvan Hareket Ekipmanı — Ronas Corduene",
        description:
          "Ronas Corduene üretim artıklarını ve malzeme kalıntılarını sokak hayvanları için hareket ekipmanına dönüştürür — performans parçalarımızla aynı mühendislikle üretilen hayvan tekerlekli sandalyeleri, hareket yardımcıları ve özel destekler.",
      },
    },
  },
  ku: {
    keywords: [
      "parçeyên performansê Tirkiye",
      "body kit Rojhilata Navîn",
      "atolyeya modîfîkasyonê",
      "aero karbonfayber",
      "kirina hewaya sar",
      "manîfolda derxistinê",
      "firseyên duristkirî",
      "parçeyên taybet",
      "Ronas Corduene",
    ],
    pages: {
      home: {
        path: "",
        title:
          "Ronas Corduene — Parçeyên Performansê û Body Kit ji bo Tirkiye û Rojhilata Navîn",
        description:
          "Parçeyên performansê, aero karbonfayber û body kitên li Tirkiyeyê têne çêkirin û ji Rojhilata Navîn re têne şandin. Kirina hewayê, manîfold, dirûv û firseyên duristkirî.",
      },
      about: {
        path: "/about",
        title: "Derbarê Ronas Corduene | Atolyeya Performans û Body Kit",
        description:
          "Ronas Corduene atolyeyeke performans û body kit a Tirkiyeyê ye ku ji Rojhilata Navîn re kar dike. Mîhendisî, sêwiran û karaktera her parçeyekê binêre.",
      },
      store: {
        path: "/store",
        title: "Dîkan — Parçeyên Performans û Body Kit | Ronas Corduene",
        description:
          "Kataloga Ronas Corduene binêre: kirina hewaya sar, manîfolda derxistinê, aero karbonfayber, body kit û firseyên duristkirî.",
      },
      contact: {
        path: "/contact",
        title: "Têkildarî | Atolyeya Performans li Tirkiyeyê",
        description:
          "Ji bo parçeyên performansê, body kit û projeyên taybet bi Ronas Corduene re têkiliyê daynin. Li Tirkiyeyê, ji Rojhilata Navîn re.",
      },
      list: {
        path: "/list",
        title: "Lîsta Parçeyên We | Ronas Corduene",
        description:
          "Lîsta parçeyên xwe ava bikin û ji Ronas Corduene re bişînin. Em hebûn, uyandin û şandinê ji bo we piştrast dikin.",
      },
      initiative: {
        path: "/initiative",
        title:
          "Înîsyatîfa Me | Ji Bermayiyên Hilberînê bo Alavên Livîna Sewalan — Ronas Corduene",
        description:
          "Ronas Corduene bermayiyên hilberînê û qutikên madeyan vedigerîne alavên livînê ji bo sewalan — kursiyên çerx, alîkarên livînê û palpişta taybet, bi heman mîhendisiyê wekî parçeyên performansê têne çêkirin.",
      },
    },
  },
  ar: {
    keywords: [
      "قطع أداء تركيا",
      "هياكل سيارات الشرق الأوسط",
      "ورشة تعديل سيارات",
      "أيرو ألياف الكربون",
      "مدخل هواء بارد",
      "مجمع عادم",
      "جنوط مطروقة",
      "قطع سيارات مخصصة",
      "روناس كوردوين",
    ],
    pages: {
      home: {
        path: "",
        title:
          "روناس كوردوين — قطع أداء وهياكل سيارات في تركيا والشرق الأوسط",
        description:
          "قطع أداء وأيرو من ألياف الكربون وهياكل سيارات مصممة في تركيا ومشحونة إلى الشرق الأوسط. مداخل هواء ومجمعات عادم وجنوط مطروقة وتصميمات مصنوعة للقيادة.",
      },
      about: {
        path: "/about",
        title: "من نحن | ورشة أداء وهياكل سيارات — روناس كوردوين",
        description:
          "روناس كوردوين ورشة أداء وهياكل سيارات في تركيا تخدم الشرق الأوسط. تعرّف على الهندسة والتصميم والشخصية خلف كل قطعة نصنعها.",
      },
      store: {
        path: "/store",
        title: "المتجر — قطع أداء وهياكل سيارات | روناس كوردوين",
        description:
          "تصفّح كتالوج روناس كوردوين: مداخل هواء باردة، مجمعات عادم، أيرو من ألياف الكربون، هياكل سيارات وجنوط مطروقة مصنوعة للطريق.",
      },
      contact: {
        path: "/contact",
        title: "اتصل بنا | ورشة أداء في تركيا — روناس كوردوين",
        description:
          "تواصل مع روناس كوردوين لقطع الأداء وهياكل السيارات والتعديلات المخصصة. مقرنا تركيا ونخدم الشرق الأوسط.",
      },
      list: {
        path: "/list",
        title: "قائمة قطعك | روناس كوردوين",
        description:
          "أنشئ قائمة قطعك وأرسلها إلى روناس كوردوين. نؤكد التوفر والتوافق والتسليم لقطع الأداء وهياكل السيارات.",
      },
      initiative: {
        path: "/initiative",
        title:
          "مبادرتنا | من بقايا الإنتاج إلى معدات حركة الحيوانات — روناس كوردوين",
        description:
          "تحوّل روناس كوردوين بقايا الإنتاج وخُرَد المواد إلى معدات حركة للحيوانات الضالة — كراسي متحركة ومساعدات حركة ودعم مخصص بالهندسة نفسها التي نصنع بها قطع الأداء.",
      },
    },
  },
};

export function getPageSeo(locale: Locale, page: PageKey): PageSeo {
  return SEO[locale].pages[page];
}

/** `hreflang` map covering every locale plus `x-default`. */
export function alternateLanguages(path: string): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[locale] = `/${locale}${path}`;
  }

  languages["x-default"] = `/${defaultLocale}${path}`;

  return languages;
}

export function localizedPath(locale: Locale, path: string): string {
  return `/${locale}${path}`;
}

export function buildMetadata({
  locale,
  page,
  title,
  description,
  keywords = [],
  type = "website",
}: {
  locale: Locale;
  page: PageKey;
  title?: string;
  description?: string;
  keywords?: string[];
  type?: "website" | "article";
}): Metadata {
  const seo = SEO[locale].pages[page];
  const resolvedTitle = title ?? seo.title;
  const resolvedDescription = description ?? seo.description;
  const url = localizedPath(locale, seo.path);

  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: resolvedTitle },
    description: resolvedDescription,
    keywords: [...keywords, ...SEO[locale].keywords],
    applicationName: SITE_NAME,
    alternates: {
      canonical: url,
      languages: alternateLanguages(seo.path),
    },
    openGraph: {
      type,
      title: resolvedTitle,
      description: resolvedDescription,
      url,
      siteName: SITE_NAME,
      locale: ogLocales[locale],
      alternateLocale: locales
        .filter((item) => item !== locale)
        .map((item) => ogLocales[item]),
      images: [
        {
          url: OG_IMAGE,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${SITE_NAME} — performance parts and body kits`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

/** Schema.org graph for the workshop, served as JSON-LD. */
export function structuredData(locale: Locale) {
  const home = SEO[locale].pages.home;
  const businessId = `${SITE_URL}/#business`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["AutoRepair", "AutoPartsStore"],
        "@id": businessId,
        name: SITE_NAME,
        description: home.description,
        url: `${SITE_URL}/${locale}`,
        image: `${SITE_URL}${OG_IMAGE}`,
        logo: `${SITE_URL}/ronas-logo.png`,
        email: BUSINESS.email,
        sameAs: [BUSINESS.instagram],
        address: {
          "@type": "PostalAddress",
          addressLocality: BUSINESS.locality,
          addressCountry: BUSINESS.country,
        },
        areaServed: [
          { "@type": "Country", name: "Turkey" },
          { "@type": "Country", name: "Iraq" },
          { "@type": "Country", name: "United Arab Emirates" },
          { "@type": "Country", name: "Saudi Arabia" },
          { "@type": "Country", name: "Qatar" },
          { "@type": "Country", name: "Kuwait" },
          { "@type": "Country", name: "Oman" },
          { "@type": "Country", name: "Bahrain" },
          { "@type": "Country", name: "Jordan" },
          { "@type": "Country", name: "Lebanon" },
        ],
        knowsLanguage: locales.map((item) => localeTags[item]),
        makesOffer: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Performance parts",
              description:
                "Cold air intakes, exhaust manifolds, intake piping and engine performance components.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Body kits and aero",
              description:
                "Carbon fibre hoods, spoilers, splitters, diffusers and complete body kits.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Wheels and interior",
              description:
                "Forged wheels, steering wheels, racing seats and interior trim.",
            },
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/${locale}`,
        name: SITE_NAME,
        inLanguage: localeTags[locale],
        publisher: { "@id": businessId },
      },
    ],
  };
}
