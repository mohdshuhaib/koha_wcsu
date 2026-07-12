-- Run this in Supabase SQL editor to make direct table deletes safe.
-- It cleans dependent records before a member/book row is deleted, avoiding FK errors.

create or replace function public.cleanup_before_member_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.books
  set status = 'available'
  where id in (
    select book_id
    from public.borrow_records
    where member_id = old.id and return_date is null
    union
    select book_id
    from public.hold_records
    where member_id = old.id and released = false
  );

  delete from public.fine_payments
  where borrow_record_id in (
    select id from public.borrow_records where member_id = old.id
  );

  delete from public.member_push_subscriptions
  where member_id = old.id;

  delete from public.hold_records
  where member_id = old.id;

  delete from public.borrow_records
  where member_id = old.id;

  return old;
end;
$$;

drop trigger if exists before_member_delete_cleanup on public.members;
create trigger before_member_delete_cleanup
before delete on public.members
for each row
execute function public.cleanup_before_member_delete();

create or replace function public.cleanup_before_book_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from public.fine_payments
  where borrow_record_id in (
    select id from public.borrow_records where book_id = old.id
  );

  delete from public.hold_records
  where book_id = old.id;

  delete from public.borrow_records
  where book_id = old.id;

  delete from public.book_reviews
  where book_id = old.id;

  return old;
end;
$$;

drop trigger if exists before_book_delete_cleanup on public.books;
create trigger before_book_delete_cleanup
before delete on public.books
for each row
execute function public.cleanup_before_book_delete();
