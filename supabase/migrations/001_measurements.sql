-- PRD §7.7 데이터 모델
create table if not exists measurements (
  id bigint generated always as identity primary key,
  sido_code text not null,
  data_time timestamptz not null,
  pm10 integer,          -- 결측은 NULL. 0으로 저장 금지 (§7.5 R-02)
  pm25 integer,          -- 결측은 NULL. 0으로 저장 금지 (§7.5 R-02)
  created_at timestamptz not null default now(),
  unique (sido_code, data_time)
);

create index if not exists idx_measurements_sido_time
  on measurements (sido_code, data_time desc);

-- 서버(service_role 키)만 접근한다. anon/브라우저 직접 접근을 막기 위해 RLS를 켜고 정책은 두지 않는다.
alter table measurements enable row level security;
