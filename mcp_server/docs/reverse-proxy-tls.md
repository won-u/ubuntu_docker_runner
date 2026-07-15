# 배포 노출 & TLS — 결정 대기 (TODO)

> **상태: 미결정 (TODO)** — 리버스 프록시/TLS/노출 방식을 어떻게 갈지 나중에 결정한다.
> 이 문서는 논의 내용을 보존해 재검토를 쉽게 하기 위한 결정 기록(decision record)이다.

## 배경 / 문제
- 현재 서버는 **plain HTTP** 로 단일 엔드포인트 `/mcp`(Streamable HTTP)를 제공하고, 인증은 **Bearer 토큰**(옵션, `MCP_AUTH_TOKEN`)만 있다.
- Bearer 토큰은 `Authorization` 헤더에 **평문**으로 실린다. 따라서:
  - **localhost / 내부 LAN / VPN 안** → 현행으로 충분(추가 작업 불필요).
  - **공개 인터넷에 HTTP 그대로 노출** → 토큰이 중간에서 탈취될 수 있음 → **TLS 필요**.
- 개인 규칙 제공 서버는 읽기 전용·저민감·쓰기/코드실행 없음 → 인증 "방식"보다 **노출 범위 + 전송 보안(TLS)** 이 핵심.
- **Claude Code Web(claude.ai/code)에서 쓰려면 서버가 공개 HTTPS 로 도달 가능해야 한다.** 이 문서의 옵션(A/B) 중 하나로 `/mcp` 를 HTTPS 뒤에 노출하는 것이 그 전제 조건이다.

## 옵션

### A. Caddy 리버스 프록시 (소규모/단순 구성 추천)
- **동작**: Client ──HTTPS(443)──▶ Caddy(TLS 종료) ──HTTP──▶ MCP(127.0.0.1:3000). 인증서는 Let's Encrypt 자동.
- **장점**: 앱 무수정, 자동 HTTPS, `text/event-stream` 자동 flush(`GET /mcp` SSE 스트림 기본 대응), 설정 2~3줄.
- **단점**: 구성요소 1개 추가, 포트포워딩 필요(공개 시), 프록시 자체 관리.
- 최소 설정:
  ```caddy
  rules.example.com {
      reverse_proxy 127.0.0.1:3000
  }
  ```

### B. Cloudflare Tunnel
- **동작**: 로컬 tunnel 데몬이 아웃바운드로 Cloudflare에 연결 → 포트 개방 없이 외부에서 HTTPS로 접근.
- **장점**: 포트포워딩 불필요, TLS·DDoS 완화 포함, 서버 IP 비노출.
- **단점**: Cloudflare 의존, 계정/도메인 설정 필요.

### C. Tailscale / WireGuard (VPN 메시)
- **동작**: 서버를 **공개하지 않고** 허가된 기기끼리 사설 메시로만 접근.
- **장점**: 공개 노출 자체가 없음 → 인증이 부차적, 가장 안전·단순.
- **단점**: 접속 기기마다 VPN 설치 필요, 외부인 공유엔 부적합.

### D. 현행 유지 (localhost / LAN 전용)
- **동작**: 지금 그대로. 외부 노출 안 함.
- **장점**: 추가 작업 0.
- **단점**: 원격 접속 불가.

## 스트리밍 주의사항 (프록시 도입 시 필수)
Streamable HTTP 에서 `GET /mcp` 는 롱-리브 SSE 이벤트 스트림이라 일반 웹앱 설정이면 끊기거나 지연된다.
- 응답 **버퍼링 OFF**.
- **read 타임아웃 크게/무제한** (기본 60초에 스트림 잘림).
- **HTTP/1.1 + keep-alive** 유지.
- 세션 식별자(`Mcp-Session-Id` 헤더)는 인스턴스-로컬이라, 다중 인스턴스로 스케일하면 **sticky session** 필요.
- nginx 예시:
  ```nginx
  location /mcp {
      proxy_pass http://127.0.0.1:3000;
      proxy_http_version 1.1;
      proxy_set_header Connection '';
      proxy_buffering off;          # 필수 (GET /mcp SSE 스트림)
      proxy_read_timeout 3600s;
      proxy_set_header Host $host;  # Origin/Host 검증 통과용
  }
  ```
- Caddy는 위 항목 대부분을 자동 처리.

## 결정에 필요한 질문
- [ ] 접근 범위는? (localhost 전용 / 내부 LAN / 나만 원격 / Claude Code Web 등 공개 HTTPS)
- [ ] per-user 로그인·감사 요구가 있나? (개인용이라 보통 불필요 — 있으면 프록시 TLS + OAuth/SSO 재검토, 아래 관련 항목)
- [ ] 포트포워딩 가능한 환경인가? (불가/싫으면 Cloudflare Tunnel 또는 Tailscale)
- [ ] 도메인/인증서 관리 주체는?

## 다음 단계 (착수 시)
- [ ] 옵션 확정 (A/B/C/D)
- [ ] 앱을 `127.0.0.1` 바인딩으로 변경하고 compose에서 3000 발행 제거(프록시 도입 시)
- [ ] (A) Caddy 서비스를 docker-compose에 추가: `mcp`(비공개) + `caddy`(443) 2컨테이너
- [ ] `GET /mcp` 스트림 프록시 설정 검증(스트림 유지/실시간성)
- [ ] README에 배포 구성 문서화

## 관련 (별도 논의, 함께 보류)
- **인증 방식**: 현재 **Bearer 토큰 채택**. **OAuth 2.1(MCP 표준)** 은 per-user SSO·감사가 필요할 때 재검토(작업량 큼 — 리소스 서버측 메타데이터+JWT 검증, IdP 위임 필요, 클라이언트 OAuth 지원 확인 필수). 규칙 서버 성격상 ROI 낮아 현시점 보류.
- 참고: OAuth를 붙여도 **HTTP면 무의미** → 노출 시 TLS가 선행 조건.
