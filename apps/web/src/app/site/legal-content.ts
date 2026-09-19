import { BRAND_NAME } from '../core/config/brand';

/**
 * Contenus juridiques (FR). Les éléments entre [crochets] sont à compléter par l'exploitant avant la mise en production
 * (voir docs/FINAL-REPORT.md). Ce texte est un modèle et ne constitue pas un avis juridique.
 */
export interface LegalDoc {
  title: string;
  updated: string;
  sections: Array<{ h: string; p: string[] }>;
}

export const LEGAL: Record<'mentions' | 'confidentialite' | 'cgu', LegalDoc> = {
  mentions: {
    title: 'Mentions légales',
    updated: '19 septembre 2026',
    sections: [
      { h: 'Éditeur', p: [`${BRAND_NAME} est édité par [Raison sociale], [forme juridique] au capital de [montant] FCFA, immatriculée au RCCM de Dakar sous le n° [numéro], NINEA [numéro], dont le siège est situé [adresse], Sénégal.`, 'Directeur de la publication : [nom]. Contact : [email].'] },
      { h: 'Hébergement', p: ['Le service est hébergé par Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Allemagne. Les images sont servies par Cloudinary Ltd.'] },
      { h: 'Contenus des créateurs', p: ['Chaque créateur est seul responsable des contenus publiés sur sa page. Tout contenu illicite peut être signalé via le menu « ··· » de la page concernée.'] },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    updated: '19 septembre 2026',
    sections: [
      { h: 'Cadre légal', p: ['Les traitements de données personnelles réalisés par [Raison sociale] respectent la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel. Les traitements ont fait l’objet des formalités requises auprès de la Commission de Protection des Données Personnelles (CDP) : [numéro de récépissé].'] },
      { h: 'Données collectées', p: ['Créateurs : email, mot de passe (haché, jamais stocké en clair), nom d’affichage, contenus de la page, images, coordonnées de reversement.', 'Acheteurs : nom, téléphone, email facultatif, détail de la commande. Les données de paiement sont traitées par le prestataire (PayDunya ou CinetPay) et ne transitent pas par nos serveurs.', 'Visiteurs : statistiques de visite agrégées, sans cookie publicitaire ni cookie tiers ; l’adresse IP n’est pas conservée (empreinte journalière non réversible, à des fins de dédoublonnage).'] },
      { h: 'Finalités et durées', p: ['Fourniture du service et de la boutique (durée du compte) ; obligations comptables pour les commandes (10 ans) ; sécurité et prévention de la fraude (12 mois pour les journaux techniques).'] },
      { h: 'Vos droits', p: ['Vous disposez d’un droit d’accès, de rectification, d’opposition et de suppression. Un créateur peut supprimer son compte à tout moment depuis ses réglages : ses données sont effacées, les commandes sont anonymisées et conservées pour les obligations légales. Pour toute demande : [email du responsable].'] },
      { h: 'Cookies', p: ['Nous utilisons uniquement des cookies strictement nécessaires : cookie de session (connexion à l’espace créateur) et jeton anti-CSRF.'] },
    ],
  },
  cgu: {
    title: 'Conditions générales d’utilisation',
    updated: '19 septembre 2026',
    sections: [
      { h: 'Objet', p: [`${BRAND_NAME} permet à des créateurs de contenu de publier une page personnelle et de vendre des produits simples payés par mobile money.`] },
      { h: 'Commission', p: ['Une commission plateforme (par défaut 8 % du montant payé) est prélevée sur chaque vente. Le montant net est reversé au créateur selon les modalités affichées dans son tableau de bord.'] },
      { h: 'Livraison', p: ['La livraison des produits est organisée directement entre le créateur et l’acheteur ; le créateur est seul responsable de l’exécution de la vente.'] },
      { h: 'Contenus interdits', p: ['Sont interdits les contenus illicites, trompeurs, haineux, portant atteinte aux droits de tiers ou à la vie privée. Nous pouvons suspendre une page en cas de manquement.'] },
    ],
  },
};
