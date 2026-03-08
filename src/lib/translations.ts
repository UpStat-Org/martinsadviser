export type Language = "pt" | "en" | "es";

export const languageLabels: Record<Language, { flag: string; label: string }> = {
  pt: { flag: "🇧🇷", label: "Português" },
  en: { flag: "🇺🇸", label: "English" },
  es: { flag: "🇪🇸", label: "Español" },
};

type TranslationKeys = {
  // Sidebar
  "nav.dashboard": string;
  "nav.clients": string;
  "nav.trucks": string;
  "nav.permits": string;
  "nav.messages": string;
  "nav.calendar": string;
  "nav.settings": string;
  "nav.users": string;
  "nav.logout": string;

  // Dashboard
  "dashboard.title": string;
  "dashboard.subtitle": string;
  "dashboard.clients": string;
  "dashboard.trucks": string;
  "dashboard.activePermits": string;
  "dashboard.expiring30d": string;
  "dashboard.emailsSent": string;
  "dashboard.pendingMsgs": string;
  "dashboard.expirations": string;
  "dashboard.permitsByType": string;
  "dashboard.messages": string;
  "dashboard.expirationSummary": string;
  "dashboard.expired": string;
  "dashboard.expiring30": string;
  "dashboard.expiring60": string;
  "dashboard.expiring90": string;
  "dashboard.valid90": string;
  "dashboard.urgentPermits": string;
  "dashboard.noUrgent": string;
  "dashboard.recentClients": string;
  "dashboard.noClients": string;
  "dashboard.noPermits": string;
  "dashboard.noMessages": string;

  // Clients
  "clients.title": string;
  "clients.subtitle": string;
  "clients.new": string;
  "clients.search": string;
  "clients.noResults": string;
  "clients.empty": string;
  "clients.registerFirst": string;
  "clients.company": string;
  "clients.phone": string;
  "clients.services": string;
  "clients.status": string;

  // Common
  "common.active": string;
  "common.inactive": string;
  "common.pending": string;
  "common.cancel": string;
  "common.save": string;
  "common.saving": string;
  "common.delete": string;
  "common.edit": string;
  "common.add": string;
  "common.back": string;
  "common.next": string;
  "common.finish": string;
  "common.loading": string;
  "common.noData": string;
  "common.expired": string;
  "common.valid": string;
  "common.sent": string;
  "common.failed": string;
  "common.cancelled": string;

  // Onboarding
  "onboarding.title": string;
  "onboarding.step": string;
  "onboarding.companyData": string;
  "onboarding.services": string;
  "onboarding.trucksStep": string;
  "onboarding.permitsStep": string;
  "onboarding.review": string;
  "onboarding.companyName": string;
  "onboarding.servicesDesc": string;
  "onboarding.trucksDesc": string;
  "onboarding.permitsDesc": string;
  "onboarding.addTruck": string;
  "onboarding.addPermit": string;
  "onboarding.finishRegistration": string;

  // Login
  "login.welcome": string;
  "login.subtitle": string;
  "login.email": string;
  "login.password": string;
  "login.submit": string;
  "login.submitting": string;
  "login.noAccount": string;
  "login.requestAccess": string;
  "login.error": string;

  // Signup
  "signup.title": string;
  "signup.subtitle": string;
  "signup.fullName": string;
  "signup.submit": string;
  "signup.submitting": string;
  "signup.hasAccount": string;
  "signup.login": string;
  "signup.success": string;
  "signup.successDesc": string;
  "signup.backToLogin": string;
  "signup.error": string;

  // Language
  "language.title": string;
};

const translations: Record<Language, TranslationKeys> = {
  pt: {
    "nav.dashboard": "Dashboard",
    "nav.clients": "Clientes",
    "nav.trucks": "Caminhões",
    "nav.permits": "Permits",
    "nav.messages": "Mensagens",
    "nav.calendar": "Calendário",
    "nav.settings": "Configurações",
    "nav.users": "Usuários",
    "nav.logout": "Sair",

    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Visão geral do seu sistema",
    "dashboard.clients": "Clientes",
    "dashboard.trucks": "Caminhões",
    "dashboard.activePermits": "Permits Ativos",
    "dashboard.expiring30d": "Vencendo em 30d",
    "dashboard.emailsSent": "Emails Enviados",
    "dashboard.pendingMsgs": "Msgs Pendentes",
    "dashboard.expirations": "Vencimentos",
    "dashboard.permitsByType": "Permits por Tipo",
    "dashboard.messages": "Mensagens",
    "dashboard.expirationSummary": "Resumo de Vencimentos",
    "dashboard.expired": "Vencidos",
    "dashboard.expiring30": "Vencendo em 30 dias",
    "dashboard.expiring60": "Vencendo em 60 dias",
    "dashboard.expiring90": "Vencendo em 90 dias",
    "dashboard.valid90": "Válidos (>90 dias)",
    "dashboard.urgentPermits": "Permits Urgentes (≤30 dias)",
    "dashboard.noUrgent": "Nenhum permit com vencimento urgente. 🎉",
    "dashboard.recentClients": "Últimos Clientes",
    "dashboard.noClients": "Nenhum cliente cadastrado.",
    "dashboard.noPermits": "Nenhum permit cadastrado.",
    "dashboard.noMessages": "Nenhuma mensagem registrada.",

    "clients.title": "Clientes",
    "clients.subtitle": "Gerencie suas transportadoras",
    "clients.new": "Novo Cliente",
    "clients.search": "Buscar por nome, DOT, MC, EIN...",
    "clients.noResults": "Nenhum cliente encontrado.",
    "clients.empty": "Nenhum cliente cadastrado ainda.",
    "clients.registerFirst": "Cadastrar primeiro cliente",
    "clients.company": "Empresa",
    "clients.phone": "Telefone",
    "clients.services": "Serviços",
    "clients.status": "Status",

    "common.active": "Ativo",
    "common.inactive": "Inativo",
    "common.pending": "Pendente",
    "common.cancel": "Cancelar",
    "common.save": "Salvar",
    "common.saving": "Salvando...",
    "common.delete": "Remover",
    "common.edit": "Editar",
    "common.add": "Adicionar",
    "common.back": "Voltar",
    "common.next": "Próximo",
    "common.finish": "Finalizar",
    "common.loading": "Carregando...",
    "common.noData": "Sem dados",
    "common.expired": "Vencido",
    "common.valid": "Válido",
    "common.sent": "Enviadas",
    "common.failed": "Falhas",
    "common.cancelled": "Canceladas",

    "onboarding.title": "Cadastrar Novo Cliente",
    "onboarding.step": "Passo",
    "onboarding.companyData": "Dados da Empresa",
    "onboarding.services": "Serviços Contratados",
    "onboarding.trucksStep": "Caminhões",
    "onboarding.permitsStep": "Permits",
    "onboarding.review": "Revisão Final",
    "onboarding.companyName": "Nome da Empresa",
    "onboarding.servicesDesc": "Selecione os serviços que este cliente utiliza.",
    "onboarding.trucksDesc": "Adicione os caminhões da frota. Você pode pular e adicionar depois.",
    "onboarding.permitsDesc": "Adicione os permits do cliente. Você pode pular e adicionar depois.",
    "onboarding.addTruck": "Adicionar Caminhão",
    "onboarding.addPermit": "Adicionar Permit",
    "onboarding.finishRegistration": "Finalizar Cadastro",

    "login.welcome": "Bem-vindo de volta",
    "login.subtitle": "Entre com suas credenciais para acessar o sistema",
    "login.email": "Email",
    "login.password": "Senha",
    "login.submit": "Entrar",
    "login.submitting": "Entrando...",
    "login.noAccount": "Não tem conta?",
    "login.requestAccess": "Solicitar acesso",
    "login.error": "Erro ao entrar",

    "signup.title": "Solicitar Acesso",
    "signup.subtitle": "Preencha seus dados para solicitar acesso ao sistema",
    "signup.fullName": "Nome completo",
    "signup.submit": "Solicitar Acesso",
    "signup.submitting": "Enviando...",
    "signup.hasAccount": "Já tem conta?",
    "signup.login": "Entrar",
    "signup.success": "Solicitação Enviada!",
    "signup.successDesc": "Sua solicitação de acesso foi enviada. Verifique seu email para confirmar o cadastro. Após confirmação, o administrador irá avaliar sua solicitação.",
    "signup.backToLogin": "Voltar ao Login",
    "signup.error": "Erro ao solicitar acesso",

    "language.title": "Idioma",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.clients": "Clients",
    "nav.trucks": "Trucks",
    "nav.permits": "Permits",
    "nav.messages": "Messages",
    "nav.calendar": "Calendar",
    "nav.settings": "Settings",
    "nav.users": "Users",
    "nav.logout": "Logout",

    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "System overview",
    "dashboard.clients": "Clients",
    "dashboard.trucks": "Trucks",
    "dashboard.activePermits": "Active Permits",
    "dashboard.expiring30d": "Expiring in 30d",
    "dashboard.emailsSent": "Emails Sent",
    "dashboard.pendingMsgs": "Pending Msgs",
    "dashboard.expirations": "Expirations",
    "dashboard.permitsByType": "Permits by Type",
    "dashboard.messages": "Messages",
    "dashboard.expirationSummary": "Expiration Summary",
    "dashboard.expired": "Expired",
    "dashboard.expiring30": "Expiring in 30 days",
    "dashboard.expiring60": "Expiring in 60 days",
    "dashboard.expiring90": "Expiring in 90 days",
    "dashboard.valid90": "Valid (>90 days)",
    "dashboard.urgentPermits": "Urgent Permits (≤30 days)",
    "dashboard.noUrgent": "No permits expiring soon. 🎉",
    "dashboard.recentClients": "Recent Clients",
    "dashboard.noClients": "No clients registered.",
    "dashboard.noPermits": "No permits registered.",
    "dashboard.noMessages": "No messages recorded.",

    "clients.title": "Clients",
    "clients.subtitle": "Manage your carriers",
    "clients.new": "New Client",
    "clients.search": "Search by name, DOT, MC, EIN...",
    "clients.noResults": "No clients found.",
    "clients.empty": "No clients registered yet.",
    "clients.registerFirst": "Register first client",
    "clients.company": "Company",
    "clients.phone": "Phone",
    "clients.services": "Services",
    "clients.status": "Status",

    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.pending": "Pending",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.back": "Back",
    "common.next": "Next",
    "common.finish": "Finish",
    "common.loading": "Loading...",
    "common.noData": "No data",
    "common.expired": "Expired",
    "common.valid": "Valid",
    "common.sent": "Sent",
    "common.failed": "Failed",
    "common.cancelled": "Cancelled",

    "onboarding.title": "Register New Client",
    "onboarding.step": "Step",
    "onboarding.companyData": "Company Data",
    "onboarding.services": "Contracted Services",
    "onboarding.trucksStep": "Trucks",
    "onboarding.permitsStep": "Permits",
    "onboarding.review": "Final Review",
    "onboarding.companyName": "Company Name",
    "onboarding.servicesDesc": "Select the services this client uses.",
    "onboarding.trucksDesc": "Add fleet trucks. You can skip and add later.",
    "onboarding.permitsDesc": "Add client permits. You can skip and add later.",
    "onboarding.addTruck": "Add Truck",
    "onboarding.addPermit": "Add Permit",
    "onboarding.finishRegistration": "Finish Registration",

    "login.welcome": "Welcome back",
    "login.subtitle": "Enter your credentials to access the system",
    "login.email": "Email",
    "login.password": "Password",
    "login.submit": "Sign In",
    "login.submitting": "Signing in...",
    "login.noAccount": "Don't have an account?",
    "login.requestAccess": "Request access",
    "login.error": "Login error",

    "signup.title": "Request Access",
    "signup.subtitle": "Fill in your details to request system access",
    "signup.fullName": "Full name",
    "signup.submit": "Request Access",
    "signup.submitting": "Submitting...",
    "signup.hasAccount": "Already have an account?",
    "signup.login": "Sign In",
    "signup.success": "Request Submitted!",
    "signup.successDesc": "Your access request has been submitted. Check your email to confirm registration. After confirmation, the administrator will review your request.",
    "signup.backToLogin": "Back to Login",
    "signup.error": "Error requesting access",

    "language.title": "Language",
  },
  es: {
    "nav.dashboard": "Panel",
    "nav.clients": "Clientes",
    "nav.trucks": "Camiones",
    "nav.permits": "Permisos",
    "nav.messages": "Mensajes",
    "nav.calendar": "Calendario",
    "nav.settings": "Configuración",
    "nav.users": "Usuarios",
    "nav.logout": "Salir",

    "dashboard.title": "Panel",
    "dashboard.subtitle": "Visión general del sistema",
    "dashboard.clients": "Clientes",
    "dashboard.trucks": "Camiones",
    "dashboard.activePermits": "Permisos Activos",
    "dashboard.expiring30d": "Vencen en 30d",
    "dashboard.emailsSent": "Emails Enviados",
    "dashboard.pendingMsgs": "Msgs Pendientes",
    "dashboard.expirations": "Vencimientos",
    "dashboard.permitsByType": "Permisos por Tipo",
    "dashboard.messages": "Mensajes",
    "dashboard.expirationSummary": "Resumen de Vencimientos",
    "dashboard.expired": "Vencidos",
    "dashboard.expiring30": "Vencen en 30 días",
    "dashboard.expiring60": "Vencen en 60 días",
    "dashboard.expiring90": "Vencen en 90 días",
    "dashboard.valid90": "Válidos (>90 días)",
    "dashboard.urgentPermits": "Permisos Urgentes (≤30 días)",
    "dashboard.noUrgent": "Ningún permiso con vencimiento urgente. 🎉",
    "dashboard.recentClients": "Últimos Clientes",
    "dashboard.noClients": "Ningún cliente registrado.",
    "dashboard.noPermits": "Ningún permiso registrado.",
    "dashboard.noMessages": "Ningún mensaje registrado.",

    "clients.title": "Clientes",
    "clients.subtitle": "Gestiona tus transportistas",
    "clients.new": "Nuevo Cliente",
    "clients.search": "Buscar por nombre, DOT, MC, EIN...",
    "clients.noResults": "Ningún cliente encontrado.",
    "clients.empty": "Ningún cliente registrado aún.",
    "clients.registerFirst": "Registrar primer cliente",
    "clients.company": "Empresa",
    "clients.phone": "Teléfono",
    "clients.services": "Servicios",
    "clients.status": "Estado",

    "common.active": "Activo",
    "common.inactive": "Inactivo",
    "common.pending": "Pendiente",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.saving": "Guardando...",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.add": "Agregar",
    "common.back": "Volver",
    "common.next": "Siguiente",
    "common.finish": "Finalizar",
    "common.loading": "Cargando...",
    "common.noData": "Sin datos",
    "common.expired": "Vencido",
    "common.valid": "Válido",
    "common.sent": "Enviados",
    "common.failed": "Fallidos",
    "common.cancelled": "Cancelados",

    "onboarding.title": "Registrar Nuevo Cliente",
    "onboarding.step": "Paso",
    "onboarding.companyData": "Datos de la Empresa",
    "onboarding.services": "Servicios Contratados",
    "onboarding.trucksStep": "Camiones",
    "onboarding.permitsStep": "Permisos",
    "onboarding.review": "Revisión Final",
    "onboarding.companyName": "Nombre de la Empresa",
    "onboarding.servicesDesc": "Selecciona los servicios que este cliente utiliza.",
    "onboarding.trucksDesc": "Agrega los camiones de la flota. Puedes omitir y agregar después.",
    "onboarding.permitsDesc": "Agrega los permisos del cliente. Puedes omitir y agregar después.",
    "onboarding.addTruck": "Agregar Camión",
    "onboarding.addPermit": "Agregar Permiso",
    "onboarding.finishRegistration": "Finalizar Registro",

    "login.welcome": "Bienvenido de vuelta",
    "login.subtitle": "Ingresa tus credenciales para acceder al sistema",
    "login.email": "Correo",
    "login.password": "Contraseña",
    "login.submit": "Ingresar",
    "login.submitting": "Ingresando...",
    "login.noAccount": "¿No tienes cuenta?",
    "login.requestAccess": "Solicitar acceso",
    "login.error": "Error al ingresar",

    "signup.title": "Solicitar Acceso",
    "signup.subtitle": "Completa tus datos para solicitar acceso al sistema",
    "signup.fullName": "Nombre completo",
    "signup.submit": "Solicitar Acceso",
    "signup.submitting": "Enviando...",
    "signup.hasAccount": "¿Ya tienes cuenta?",
    "signup.login": "Ingresar",
    "signup.success": "¡Solicitud Enviada!",
    "signup.successDesc": "Tu solicitud de acceso ha sido enviada. Revisa tu correo para confirmar el registro. Después de la confirmación, el administrador evaluará tu solicitud.",
    "signup.backToLogin": "Volver al Login",
    "signup.error": "Error al solicitar acceso",

    "language.title": "Idioma",
  },
};

export function getTranslation(lang: Language, key: keyof TranslationKeys): string {
  return translations[lang]?.[key] ?? translations.pt[key] ?? key;
}

export default translations;
