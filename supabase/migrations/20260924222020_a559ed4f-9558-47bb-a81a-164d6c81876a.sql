REVOKE ALL ON FUNCTION public.can_org_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_org_write(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.list_org_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_members(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.invite_member(uuid, text, public.org_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, public.org_role) TO authenticated;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_pending_messages_for_org(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.claim_pending_messages_for_org(uuid, integer, text) TO service_role;