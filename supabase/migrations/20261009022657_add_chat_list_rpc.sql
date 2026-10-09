create or replace function public.get_chat_list()
returns table (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  conversation_id uuid,
  last_message text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with accepted_connections as (
    select
      case
        when c.user_id = auth.uid() then c.contact_id
        else c.user_id
      end as other_user_id,
      max(c.created_at) as connected_at
    from public.connections as c
    where
      c.status = 'accepted'
      and (
        c.user_id = auth.uid()
        or c.contact_id = auth.uid()
      )
    group by
      case
        when c.user_id = auth.uid() then c.contact_id
        else c.user_id
      end
  )
  select
    ac.other_user_id as user_id,
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(p.username), ''),
      'Unknown'
    ) as full_name,
    p.username::text as username,
    p.avatar_url::text as avatar_url,
    conv.id as conversation_id,
    latest.content::text as last_message,
    latest.created_at as last_message_at,
    latest.sender_id as last_message_sender_id,
    coalesce(unread.total, 0)::bigint as unread_count
  from accepted_connections as ac
  left join public.profiles as p
    on p.id = ac.other_user_id
  left join public.conversations as conv
    on conv.user_one_id = least(auth.uid(), ac.other_user_id)
    and conv.user_two_id = greatest(auth.uid(), ac.other_user_id)
  left join lateral (
    select
      m.content,
      m.created_at,
      m.sender_id
    from public.messages as m
    where m.conversation_id = conv.id
    order by m.created_at desc, m.id desc
    limit 1
  ) as latest on true
  left join lateral (
    select count(*) as total
    from public.messages as m
    where
      m.conversation_id = conv.id
      and m.receiver_id = auth.uid()
      and m.is_read = false
  ) as unread on true
  order by
    coalesce(latest.created_at, ac.connected_at) desc,
    ac.other_user_id;
$$;

revoke all on function public.get_chat_list() from public;
revoke all on function public.get_chat_list() from anon;
grant execute on function public.get_chat_list() to authenticated;