import type { Language } from "@/lib/translations";

export const trackingCopy: Record<Language, {
  title: string; createLink: string; stopSharing: string; description: string;
  waiting: string; updatedNow: string; updatedMinutes: (minutes: number) => string;
  live: string; awaitingConsent: string; expires: (date: string) => string;
  linkCreated: string; linkCreatedDesc: string; linkCopied: string;
  createFailed: string; stopFailed: string; mapWaiting: string; currentLocation: string;
  publicTitle: string; verifying: string; privacy: (date: string) => string;
  name: string; start: string; keepOpen: string; expired: string; inactive: string;
  unsupported: string; sharingActive: string; denied: string; unavailable: string;
  locationSent: string; locationFailed: string; startFailed: string; stopFailedPublic: string;
}> = {
  pt: {
    title: "Rastreamento ao vivo", createLink: "Criar link do motorista", stopSharing: "Encerrar compartilhamento",
    description: "Crie um link temporário para o motorista compartilhar a localização durante esta viagem.",
    waiting: "Aguardando o motorista", updatedNow: "Atualizado agora", updatedMinutes: (m) => `Atualizado há ${m} min`,
    live: "Ao vivo", awaitingConsent: "Aguardando autorização", expires: (date) => `Expira em ${date}`,
    linkCreated: "Link de rastreamento criado", linkCreatedDesc: "O link foi copiado e expira em 12 horas.", linkCopied: "Link copiado",
    createFailed: "Não foi possível criar o link", stopFailed: "Não foi possível encerrar o rastreamento",
    mapWaiting: "O mapa aparecerá quando a primeira localização for compartilhada.", currentLocation: "Localização atual",
    publicTitle: "Rastreamento da viagem", verifying: "Verificando seu link seguro de rastreamento…",
    privacy: (date) => `Sua localização é compartilhada somente nesta viagem. Você pode encerrar quando quiser; este link expira em ${date}.`,
    name: "Seu nome (opcional)", start: "Iniciar compartilhamento de localização", keepOpen: "Para atualizações confiáveis, mantenha esta página aberta e permita a localização precisa.",
    expired: "Este link de rastreamento expirou.", inactive: "Este link de rastreamento não está mais ativo.",
    unsupported: "Este navegador não suporta compartilhamento de localização.", sharingActive: "Compartilhamento ativo. Mantenha esta página aberta durante a viagem.",
    denied: "A permissão de localização não foi concedida.", unavailable: "Não foi possível determinar sua localização.",
    locationSent: "Localização compartilhada com sucesso.", locationFailed: "Não foi possível enviar esta localização. Verifique sua conexão e tente novamente.",
    startFailed: "Não foi possível iniciar o compartilhamento.", stopFailedPublic: "Não foi possível encerrar o compartilhamento.",
  },
  en: {
    title: "Live tracking", createLink: "Create driver link", stopSharing: "Stop sharing",
    description: "Create a temporary link for the driver to share their location during this trip.",
    waiting: "Waiting for the driver", updatedNow: "Updated just now", updatedMinutes: (m) => `Updated ${m} min ago`,
    live: "Live", awaitingConsent: "Awaiting consent", expires: (date) => `Expires ${date}`,
    linkCreated: "Tracking link created", linkCreatedDesc: "The link was copied. It expires in 12 hours.", linkCopied: "Link copied",
    createFailed: "Could not create link", stopFailed: "Could not stop tracking",
    mapWaiting: "The map will appear after the first shared location.", currentLocation: "Current location",
    publicTitle: "Live trip tracking", verifying: "Verifying your secure tracking link…",
    privacy: (date) => `Your location is shared only for this trip. You can stop it at any time; this link expires on ${date}.`,
    name: "Your name (optional)", start: "Start sharing location", keepOpen: "For reliable updates, keep this page open and allow precise location access.",
    expired: "This tracking link has expired.", inactive: "This tracking link is no longer active.",
    unsupported: "This browser does not support location sharing.", sharingActive: "Sharing is active. Keep this page open during the trip.",
    denied: "Location permission was not granted.", unavailable: "We could not determine your location.",
    locationSent: "Location shared successfully.", locationFailed: "Could not send this location. Check your connection and try again.",
    startFailed: "Could not start sharing.", stopFailedPublic: "Could not stop sharing.",
  },
  es: {
    title: "Seguimiento en vivo", createLink: "Crear enlace del conductor", stopSharing: "Finalizar uso compartido",
    description: "Crea un enlace temporal para que el conductor comparta su ubicación durante este viaje.",
    waiting: "Esperando al conductor", updatedNow: "Actualizado ahora", updatedMinutes: (m) => `Actualizado hace ${m} min`,
    live: "En vivo", awaitingConsent: "Esperando autorización", expires: (date) => `Expira ${date}`,
    linkCreated: "Enlace de seguimiento creado", linkCreatedDesc: "El enlace se copió y expira en 12 horas.", linkCopied: "Enlace copiado",
    createFailed: "No se pudo crear el enlace", stopFailed: "No se pudo finalizar el seguimiento",
    mapWaiting: "El mapa aparecerá después de la primera ubicación compartida.", currentLocation: "Ubicación actual",
    publicTitle: "Seguimiento de viaje en vivo", verifying: "Verificando tu enlace seguro de seguimiento…",
    privacy: (date) => `Tu ubicación se comparte solo durante este viaje. Puedes detenerla en cualquier momento; este enlace expira el ${date}.`,
    name: "Tu nombre (opcional)", start: "Iniciar uso compartido de ubicación", keepOpen: "Para actualizaciones confiables, mantén esta página abierta y permite la ubicación precisa.",
    expired: "Este enlace de seguimiento expiró.", inactive: "Este enlace de seguimiento ya no está activo.",
    unsupported: "Este navegador no admite compartir ubicación.", sharingActive: "El uso compartido está activo. Mantén esta página abierta durante el viaje.",
    denied: "No se concedió permiso de ubicación.", unavailable: "No se pudo determinar tu ubicación.",
    locationSent: "Ubicación compartida correctamente.", locationFailed: "No se pudo enviar esta ubicación. Revisa tu conexión e inténtalo de nuevo.",
    startFailed: "No se pudo iniciar el uso compartido.", stopFailedPublic: "No se pudo finalizar el uso compartido.",
  },
};
