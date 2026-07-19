import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      welcome: "Welcome to ClickFlash Gallery",
      upsell: {
        badge: "⚡ INSTANT REWARD",
        title: "Share to Unlock 15% OFF",
        subtitle: "Share your photo gallery with friends or on social media to instantly unlock promo code SHARE15 on your order.",
        button: "Share & Activate 15% OFF",
        copyLink: "Copy Gallery Link",
        linkCopied: "Link Copied! Discount Unlocked!",
        unlockedBadge: "🎉 DISCOUNT UNLOCKED!",
        unlockedTitle: "Promo Code Active: SHARE15",
        appliedMessage: "Your 15% discount is unlocked and ready for checkout!",
        expiresIn: "Offer expires in:",
        shareOn: "Quick share:",
        language: "Language",
      },
      checkout: {
        discountCodeLabel: "Promo / Discount Code",
        applyCode: "Apply Code",
        discountApplied: "Discount Applied (15% OFF)",
        totalAfterDiscount: "Discounted Total",
      }
    }
  },
  es: {
    translation: {
      welcome: "Bienvenido a la Galería ClickFlash",
      upsell: {
        badge: "⚡ RECOMPENSA INSTANTÁNEA",
        title: "Comparte y Desbloquea 15% de Descuento",
        subtitle: "Comparte tu galería de fotos con amigos o en redes sociales para activar al instante el código SHARE15 en tu pedido.",
        button: "Compartir y Activar 15% DTO",
        copyLink: "Copiar Enlace",
        linkCopied: "¡Enlace copiado! ¡Descuento desbloqueado!",
        unlockedBadge: "🎉 ¡DESCUENTO DESBLOQUEADO!",
        unlockedTitle: "Código Activo: SHARE15",
        appliedMessage: "¡Tu descuento del 15% está listo para aplicarse al finalizar la compra!",
        expiresIn: "La oferta expira en:",
        shareOn: "Compartir rápido:",
        language: "Idioma",
      },
      checkout: {
        discountCodeLabel: "Código de Promoción / Descuento",
        applyCode: "Aplicar Código",
        discountApplied: "Descuento Aplicado (15% DTO)",
        totalAfterDiscount: "Total con Descuento",
      }
    }
  },
  fr: {
    translation: {
      welcome: "Bienvenue sur la Galerie ClickFlash",
      upsell: {
        badge: "⚡ RÉCOMPENSE INSTANTANÉE",
        title: "Partagez et Débloquez -15%",
        subtitle: "Partagez votre galerie photo avec vos amis ou sur les réseaux sociaux pour débloquer immédiatement le code SHARE15.",
        button: "Partager & Activer -15%",
        copyLink: "Copier le Lien",
        linkCopied: "Lien copié ! Réduction débloquée !",
        unlockedBadge: "🎉 RÉDUCTION DÉBLOQUÉE !",
        unlockedTitle: "Code Actif : SHARE15",
        appliedMessage: "Votre réduction de 15% est débloquée et prête pour votre commande !",
        expiresIn: "L'offre expire dans :",
        shareOn: "Partage rapide :",
        language: "Langue",
      },
      checkout: {
        discountCodeLabel: "Code Promo / Réduction",
        applyCode: "Appliquer",
        discountApplied: "Réduction Appliquée (-15%)",
        totalAfterDiscount: "Total avec Réduction",
      }
    }
  },
  de: {
    translation: {
      welcome: "Willkommen in der ClickFlash Galerie",
      upsell: {
        badge: "⚡ SOFORT-RABATT",
        title: "Teilen & 15% Rabatt freischalten",
        subtitle: "Teile deine Fotogalerie mit Freunden oder in sozialen Medien, um den Aktionscode SHARE15 sofort für deine Bestellung freizuschalten.",
        button: "Teilen & 15% Rabatt aktivieren",
        copyLink: "Link kopieren",
        linkCopied: "Link kopiert! Rabatt freigeschaltet!",
        unlockedBadge: "🎉 RABATT FREIGESCHALTET!",
        unlockedTitle: "Aktionscode aktiv: SHARE15",
        appliedMessage: "Dein 15% Rabatt ist freigeschaltet und bereit für die Kasse!",
        expiresIn: "Angebot endet in:",
        shareOn: "Schnell teilen:",
        language: "Sprache",
      },
      checkout: {
        discountCodeLabel: "Aktions- / Gutscheincode",
        applyCode: "Code anwenden",
        discountApplied: "Rabatt angewendet (15% Rabatt)",
        totalAfterDiscount: "Rabattierter Gesamtbetrag",
      }
    }
  },
  ar: {
    translation: {
      welcome: "مرحباً بكم في معرض كليك فلاش",
      upsell: {
        badge: "⚡ مكافأة فورية",
        title: "شارك واحصل على خصم 15%",
        subtitle: "شارك معرض الصور الخاص بك مع أصدقائك أو على وسائل التواصل الاجتماعي لتفعيل كود الخصم SHARE15 فوراً على طلبك.",
        button: "شارك وفعل الخصم 15%",
        copyLink: "نسخ رابط المعرض",
        linkCopied: "تم نسخ الرابط! تم تفعيل الخصم!",
        unlockedBadge: "🎉 تم فتح الخصم بنجاح!",
        unlockedTitle: "كود الخصم النشط: SHARE15",
        appliedMessage: "خصم 15% جاهز للتطبيق عند إتمام الطلب!",
        expiresIn: "ينتهي العرض خلال:",
        shareOn: "مشاركة سريعة:",
        language: "اللغة",
      },
      checkout: {
        discountCodeLabel: "كود الخصم / الترويج",
        applyCode: "تطبيق الكود",
        discountApplied: "تم تطبيق الخصم (خصم 15%)",
        totalAfterDiscount: "الإجمالي بعد الخصم",
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
