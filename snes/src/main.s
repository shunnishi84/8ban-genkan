; 8番玄関 スーパーファミコン版（試作品）のエンジン。
; 画面: Mode 1。BG1 = イラスト（4bpp）、BG3 = 文字の窓・上の帯（2bpp、最前面）、OBJ = カーソル。
; 中身（文章・画像・流れ）は snes/build.py が作るデータとスクリプト（バイトコード）で、ここはそれを動かすだけ。

.p816
.smart

.include "gen.inc"

; ------------------------------------------------------------------ VRAM の割り当て（ワード単位）
VRAM_BG1_TILES = $0000
VRAM_BG3_TILES = $4000
VRAM_BG1_MAP   = $5800
VRAM_BG3_MAP   = $5C00
VRAM_OBJ_TILES = $6000

; BG3 のタイル番号: 0〜255 = 文字の窓（ページ）、256〜319 = 上の帯、DIGIT_TOP/BOT = 時計の数字、BLANK = 透明
TILE_HUD   = 256
TILE_BLANK = 511
PRIO       = $2000

; ボタン（$4218 を 16 ビットで読んだときのビット）
PAD_B     = $8000
PAD_START = $1000
PAD_UP    = $0800
PAD_DOWN  = $0400
PAD_LEFT  = $0200
PAD_RIGHT = $0100
PAD_A     = $0080

.zeropage
scr:       .res 3      ; スクリプトの読み出し位置（ロングポインタ）
ptr:       .res 3      ; DMA の転送元
tmp:       .res 2
tmp2:      .res 2
joy:       .res 2
joyp:      .res 2
joyn:      .res 2
nmi_count: .res 1
time:      .res 2      ; 時刻（前日 0:00 からの分。22:59 = 1379、翌 1:00 = 1500）
hud:       .res 1
cur:       .res 1
mcount:    .res 1
mcancel:   .res 1
mtab:      .res 2      ; メニューの項目表（スクリプト内のアドレス）
shake:     .res 1
spr_x:     .res 1
spr_y:     .res 1
spr_t:     .res 1
bright:    .res 1
flags:     .res 32

.segment "CODE"

; ------------------------------------------------------------------ 起動
reset:
  sei
  clc
  xce                     ; ネイティブモードへ
  rep #$38                ; A16 / I16 / 10進オフ
  ldx #$1FFF
  txs
  lda #$0000
  tcd                     ; ダイレクトページ = $0000
  sep #$20
  pha
  plb                     ; データバンク = 0

  lda #$80
  sta $2100               ; 画面を消す（強制ブランク）
  stz $4200
  ; PPU のレジスタを 0 に
  ldx #$2101
@zero:
  stz $00,x
  inx
  cpx #$2134
  bne @zero
  ; スクロール（2回書き）。縦は -1（$3FF）にすると 1 行目がぴったり画面の上端に来る
  ldx #$0000
@scroll:
  stz $210D,x
  stz $210D,x
  inx
  inx
  cpx #$0008
  bne @scroll
  lda #$FF
  sta $210E
  lda #$03
  sta $210E
  lda #$FF
  sta $2112
  lda #$03
  sta $2112

  ; ワーク RAM（ダイレクトページ）を 0 に
  rep #$20
  ldx #$0000
@ram:
  stz $00,x
  inx
  inx
  cpx #$0100
  bne @ram
  sep #$20

  jsr clear_vram
  jsr clear_cgram
  jsr hide_all_sprites

  ; 画面モード
  lda #$09                ; Mode 1、BG3 を最前面に
  sta $2105
  lda #((VRAM_BG1_MAP / $400) << 2)
  sta $2107
  lda #((VRAM_BG3_MAP / $400) << 2)
  sta $2109
  lda #$00                ; BG1/BG2 のタイル = $0000
  sta $210B
  lda #(VRAM_BG3_TILES / $1000)
  sta $210C
  lda #(VRAM_OBJ_TILES / $2000)
  sta $2101               ; スプライト 8x8 / 16x16
  lda #$15                ; BG1 + BG3 + OBJ を表示
  sta $212C

  ; 固定の素材（上の帯・数字・カーソル・文字の色）
  jsr load_fixed
  jsr init_bg3_map

  ; スクリプトの先頭から
  lda #^script
  sta scr+2
  rep #$20
  lda #.loword(script)
  sta scr
  sep #$20
  lda #240
  sta spr_y

  lda #$81                ; NMI + 自動パッド読み取り
  sta $4200
  cli
  jmp run

; ------------------------------------------------------------------ 割り込み
nmi:
  rep #$30
  pha
  sep #$20
  lda $4210
  inc nmi_count
  rep #$30
  pla
  rti

irq:
  rti

; ------------------------------------------------------------------ 1 フレーム進める（垂直帰線の頭で VRAM を触る処理をする）
wait_nmi:
  .a8
  .i16
  lda nmi_count
@w:
  cmp nmi_count
  beq @w
  rts

; スプライトとスクロールの更新 → パッド読み取り
frame:
  .a8
  .i16
  jsr wait_nmi
  jsr vblank_updates
  jsr read_joy
  rts

vblank_updates:
  .a8
  .i16
  ; スプライト 0 番だけ使う
  stz $2102
  stz $2103
  lda spr_x
  sta $2104
  lda spr_y
  sta $2104
  lda spr_t
  sta $2104
  lda #$30
  sta $2104
  ; 画面の揺れ（BG1 の横スクロール）
  lda shake
  beq @noshake
  dec shake
  lda nmi_count
  and #$03
  asl
  asl
  sec
  sbc #$06
  sta $210D
  lda #$00
  sta $210D
  rts
@noshake:
  stz $210D
  stz $210D
  rts

read_joy:
  .a8
  .i16
@w:
  lda $4212
  and #$01
  bne @w
  rep #$20
  lda $4218
  sta joy
  lda joyp
  eor #$FFFF
  and joy
  sta joyn
  lda joy
  sta joyp
  sep #$20
  rts

; ------------------------------------------------------------------ DMA
; ptr = 転送元、X = VRAM のワードアドレス、Y = バイト数
dma_vram:
  .a8
  .i16
  lda #$80
  sta $2115
  stx $2116
  lda #$01
  sta $4300
  lda #$18
  sta $4301
  ldx ptr
  stx $4302
  lda ptr+2
  sta $4304
  sty $4305
  lda #$01
  sta $420B
  rts

; ptr = 転送元、A = 色番号、Y = バイト数
dma_cgram:
  .a8
  .i16
  sta $2121
  stz $4300
  lda #$22
  sta $4301
  ldx ptr
  stx $4302
  lda ptr+2
  sta $4304
  sty $4305
  lda #$01
  sta $420B
  rts

clear_vram:
  .a8
  .i16
  lda #$80
  sta $2115
  ldx #$0000
  stx $2116
  lda #$09                ; 転送元固定・2 レジスタ
  sta $4300
  lda #$18
  sta $4301
  ldx #.loword(zero_word)
  stx $4302
  lda #^zero_word
  sta $4304
  ldx #$0000              ; 0 = 65536 バイト
  stx $4305
  lda #$01
  sta $420B
  rts

clear_cgram:
  .a8
  .i16
  stz $2121
  ldx #$0200
@c:
  stz $2122
  dex
  bne @c
  rts

hide_all_sprites:
  .a8
  .i16
  stz $2102
  stz $2103
  ldx #$0080
@s:
  stz $2104
  lda #240
  sta $2104
  stz $2104
  stz $2104
  dex
  bne @s
  ldx #$0020
@h:
  stz $2104
  dex
  bne @h
  rts

load_fixed:
  .a8
  .i16
  ; 文字の色（BG3 パレット 0）
  lda #^text_palette
  sta ptr+2
  ldx #.loword(text_palette)
  stx ptr
  lda #$00
  ldy #$0008
  jsr dma_cgram
  ; カーソルの色（OBJ パレット 0 = 128 番）
  lda #^obj_palette
  sta ptr+2
  ldx #.loword(obj_palette)
  stx ptr
  lda #128
  ldy #$0008
  jsr dma_cgram
  ; 上の帯 + 数字（BG3 タイル 256〜）
  lda #^hud_tiles
  sta ptr+2
  ldx #.loword(hud_tiles)
  stx ptr
  ldx #(VRAM_BG3_TILES + TILE_HUD * 8)
  ldy #HUD_TILES_SIZE
  jsr dma_vram
  ; カーソル（OBJ タイル 0〜1）
  lda #^obj_tiles
  sta ptr+2
  ldx #.loword(obj_tiles)
  stx ptr
  ldx #VRAM_OBJ_TILES
  ldy #$0040
  jsr dma_vram
  rts

; BG3 の地図: 全部透明、下の 8 行（20〜27）だけ文字の窓のタイル 0〜255。
; 上の帯は絵の上に出したいので優先ビットつき、文字の窓は絵と重ならないので優先ビットなし
init_bg3_map:
  .a8
  .i16
  lda #$80
  sta $2115
  ldx #VRAM_BG3_MAP
  stx $2116
  rep #$20
  ldx #$0000
@all:
  lda #(TILE_BLANK | PRIO)
  sta $2118
  inx
  cpx #$0400
  bne @all
  lda #(VRAM_BG3_MAP + 20 * 32)
  sta $2116
  ldx #$0000
@box:
  txa                     ; 文字の窓は優先ビットなし（カーソルのスプライトを上に重ねるため）
  sta $2118
  inx
  cpx #$0100
  bne @box
  sep #$20
  rts

; ------------------------------------------------------------------ 明るさ
fade_out:
  .a8
  .i16
@l:
  jsr frame
  lda bright
  beq @done
  dec
  sta bright
  sta $2100
  bra @l
@done:
  lda #$80
  sta $2100
  rts

fade_in:
  .a8
  .i16
@l:
  jsr frame
  lda bright
  cmp #$0F
  beq @done
  inc
  sta bright
  sta $2100
  bra @l
@done:
  rts

; ------------------------------------------------------------------ 文字の窓（ページ）を出す: A16 = ページ番号
show_page:
  .a16
  .i16
  rep #$20
  sta tmp
  asl
  clc
  adc tmp                 ; ×3
  tax
  lda page_tbl,x
  sta ptr
  lda page_tbl+1,x
  sta ptr+1
  sep #$20
  jsr wait_nmi
  ldx #VRAM_BG3_TILES
  ldy #$1000
  jsr dma_vram
  jsr vblank_updates
  rts

; ------------------------------------------------------------------ 画像を出す: A8 = 画像番号
load_image:
  .a8
  .i16
  pha
  jsr fade_out
  pla
  rep #$20
  and #$00FF
  asl
  asl
  sta tmp
  asl
  clc
  adc tmp                 ; ×12
  tax
  ; タイル
  lda image_tbl,x
  sta ptr
  lda image_tbl+1,x
  sta ptr+1
  lda image_tbl+3,x
  tay
  phx
  sep #$20
  ldx #VRAM_BG1_TILES
  jsr dma_vram
  rep #$20
  plx
  ; 地図（2KB）
  lda image_tbl+5,x
  sta ptr
  lda image_tbl+6,x
  sta ptr+1
  phx
  sep #$20
  ldx #VRAM_BG1_MAP
  ldy #$0800
  jsr dma_vram
  rep #$20
  plx
  ; パレット（7 本 × 16 色 = 224 バイト、16 番から。0 番の 16 色は文字の窓と共用なので使わない）
  lda image_tbl+8,x
  sta ptr
  lda image_tbl+9,x
  sta ptr+1
  sep #$20
  lda #16
  ldy #$00E0
  jsr dma_cgram
  jsr fade_in
  rts

; ------------------------------------------------------------------ 上の帯と時計
draw_hud:
  .a8
  .i16
  jsr wait_nmi
  lda #$80
  sta $2115
  ldx #VRAM_BG3_MAP
  stx $2116
  rep #$20
  ldx #$0000
@l:
  lda hud
  and #$00FF
  beq @blank
  txa
  clc
  adc #(TILE_HUD | PRIO)
  bra @put
@blank:
  lda #(TILE_BLANK | PRIO)
@put:
  sta $2118
  inx
  cpx #$0040
  bne @l
  sep #$20
  lda hud
  beq @off
  jsr draw_clock_now
@off:
  jsr vblank_updates
  rts

draw_clock:
  .a8
  .i16
  lda hud
  beq @no
  jsr wait_nmi
  jsr draw_clock_now
  jsr vblank_updates
@no:
  rts

; 時:分 を 5 マス（27〜31 列目、上下 2 段）に書く。垂直帰線中に呼ぶこと
draw_clock_now:
  .a8
  .i16
  ; 時 = time / 60、分 = time % 60
  rep #$20
  lda time
  sta $4204
  sep #$20
  lda #60
  sta $4206
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  lda $4214               ; 商（時）
  cmp #24
  bcc @h
  sbc #24
@h:
  sta tmp
  lda $4216               ; 余り（分）
  sta tmp+1
  ; 上の段
  rep #$20
  lda #(VRAM_BG3_MAP + 27)
  sta $2116
  sep #$20
  lda #DIGIT_TOP
  jsr put_clock_row
  rep #$20
  lda #(VRAM_BG3_MAP + 32 + 27)
  sta $2116
  sep #$20
  lda #DIGIT_BOT
  jsr put_clock_row
  rts

; A = 数字タイルの先頭（上段か下段）。tmp = 時、tmp+1 = 分
put_clock_row:
  .a8
  .i16
  sta tmp2
  lda tmp
  jsr put_two_digits
  lda #10                 ; 「:」は数字 10 番
  jsr put_digit
  lda tmp+1
  jsr put_two_digits
  rts

put_two_digits:
  .a8
  .i16
  rep #$20
  and #$00FF
  sta $4204
  sep #$20
  lda #10
  sta $4206
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  nop
  lda $4214
  jsr put_digit
  lda $4216
  jsr put_digit
  rts

put_digit:
  .a8
  .i16
  clc
  adc tmp2
  sta $2118
  lda #>(PRIO + $0100)    ; タイル番号は 256 以上なので上位ビット 1 + 優先
  sta $2119
  rts

; ------------------------------------------------------------------ スクリプト
fetch:
  .a8
  .i16
  lda [scr]
  rep #$20
  inc scr
  sep #$20
  rts

fetch16:
  .a8
  .i16
  rep #$20
  lda [scr]
  inc scr
  inc scr
  sta tmp
  sep #$20
  rts

run:
  .a8
  .i16
  jsr fetch
  rep #$20
  and #$00FF
  asl
  tax
  sep #$20
  jmp (op_table,x)

op_table:
  .addr op_reset, op_page, op_menu, op_jump, op_set, op_if, op_addtime, op_image, op_iflate, op_hud, op_shake, op_fade

op_reset:
  .a8
  .i16
  rep #$20
  ldx #$0000
@f:
  stz flags,x
  inx
  inx
  cpx #$0020
  bne @f
  lda #START_TIME
  sta time
  sep #$20
  stz hud
  jmp run

; PAGE p16: 文字の窓を出して A ボタンを待つ（右下に ▼）
op_page:
  .a8
  .i16
  jsr fetch16
  rep #$20
  lda tmp
  jsr show_page
  .a8                     ; show_page は A8 で戻る（ca65 に教えておかないと即値が 16 ビットで組まれる）
  lda #1
  sta spr_t
  lda #240
  sta spr_x
  lda #212
  sta spr_y
@wait:
  jsr frame
  ; ▼ を点滅させる
  lda nmi_count
  and #$10
  beq @show
  lda #240
  sta spr_y
  bra @in
@show:
  lda #212
  sta spr_y
@in:
  rep #$20
  lda joyn
  and #(PAD_A | PAD_B | PAD_START)
  sep #$20
  beq @wait
  lda #240
  sta spr_y
  jmp run

; MENU p16 n8 cancel8 { x8 y8 target16 } × n
op_menu:
  .a8
  .i16
  jsr fetch16
  rep #$20
  lda tmp
  jsr show_page
  .a8                     ; show_page は A8 で戻る（ca65 に教えておかないと即値が 16 ビットで組まれる）
  jsr fetch
  sta mcount
  jsr fetch
  sta mcancel
  rep #$20
  lda scr
  sta mtab
  sep #$20
  stz cur
  stz spr_t
@loop:
  jsr place_cursor
  jsr frame
  rep #$20
  lda joyn
  sep #$20
  ; 上・左 = ひとつ前、下・右 = ひとつ後（端は反対側へ）
  rep #$20
  and #(PAD_UP | PAD_LEFT)
  sep #$20
  beq @notup
  lda cur
  bne @dec
  lda mcount
@dec:
  dec
  sta cur
  bra @loop
@notup:
  rep #$20
  lda joyn
  and #(PAD_DOWN | PAD_RIGHT)
  sep #$20
  beq @notdown
  lda cur
  inc
  cmp mcount
  bcc @setc
  lda #0
@setc:
  sta cur
  bra @loop
@notdown:
  rep #$20
  lda joyn
  and #(PAD_A | PAD_START)
  sep #$20
  bne @choose
  rep #$20
  lda joyn
  and #PAD_B
  sep #$20
  beq @loop
  lda mcancel
  cmp #$FF
  beq @loop
  sta cur
@choose:
  lda #240
  sta spr_y
  ; 選んだ項目の飛び先へ
  rep #$20
  lda cur
  and #$00FF
  asl
  asl
  clc
  adc mtab
  tay
  iny
  iny
  lda [scr]               ; ダミー（バンクは scr+2 を使う）
  sty scr
  lda [scr]
  sta scr
  sep #$20
  jmp run

; cur 番の項目の (x, y) にカーソルを置く
place_cursor:
  .a8
  .i16
  rep #$20
  lda cur
  and #$00FF
  asl
  asl
  clc
  adc mtab
  sta tmp2
  sep #$20
  ; [scr] の代わりに tmp2 を使うため、一時的に scr を差し替える
  rep #$20
  lda scr
  pha
  lda tmp2
  sta scr
  sep #$20
  lda [scr]
  sta spr_x
  rep #$20
  inc scr
  sep #$20
  lda [scr]
  sta spr_y
  rep #$20
  pla
  sta scr
  sep #$20
  rts

op_jump:
  .a8
  .i16
  jsr fetch16
  rep #$20
  lda tmp
  sta scr
  sep #$20
  jmp run

; SET f8
op_set:
  .a8
  .i16
  jsr fetch
  jsr flag_addr
  lda flags,x
  ora bitmask,y
  sta flags,x
  jmp run

; IF f8 target16（立っていたら飛ぶ）
op_if:
  .a8
  .i16
  jsr fetch
  jsr flag_addr
  lda flags,x
  and bitmask,y
  pha
  jsr fetch16
  pla
  beq @no
  rep #$20
  lda tmp
  sta scr
  sep #$20
@no:
  jmp run

; A8 = フラグ番号 → X = バイト位置、Y = ビット位置
flag_addr:
  .a8
  .i16
  rep #$20
  and #$00FF
  pha
  and #$0007
  tay
  pla
  lsr
  lsr
  lsr
  tax
  sep #$20
  rts

op_addtime:
  .a8
  .i16
  jsr fetch
  rep #$20
  and #$00FF
  clc
  adc time
  sta time
  sep #$20
  jsr draw_clock
  jmp run

op_image:
  .a8
  .i16
  jsr fetch
  jsr load_image
  jmp run

; IFLATE target16（制限時刻を過ぎていたら飛ぶ）
op_iflate:
  .a8
  .i16
  jsr fetch16
  rep #$20
  lda time
  cmp #(LIMIT_TIME + 1)
  bcc @no
  lda tmp
  sta scr
@no:
  sep #$20
  jmp run

op_hud:
  .a8
  .i16
  jsr fetch
  sta hud
  jsr draw_hud
  jmp run

op_shake:
  .a8
  .i16
  jsr fetch
  sta shake
  jmp run

op_fade:
  .a8
  .i16
  jsr fade_out
  jmp run

.segment "RODATA"
zero_word:
  .word $0000
bitmask:
  .byte $01, $02, $04, $08, $10, $20, $40, $80

.segment "HEADER"
  ; $FFC0: ゲーム名（21 バイト）
  .byte "8BAN GENKAN PROTO    "
  .byte $20               ; LoROM
  .byte $00               ; ROM のみ
  .byte ROM_SIZE_CODE     ; ROM サイズ
  .byte $00               ; SRAM なし
  .byte $00               ; 日本
  .byte $00               ; メーカー
  .byte $00               ; バージョン
  .word $FFFF             ; チェックサムの補数（build.py が書き換える）
  .word $0000             ; チェックサム

.segment "VECTORS"
  ; ネイティブモード（$FFE0〜）
  .word 0, 0
  .addr irq               ; COP
  .addr irq               ; BRK
  .addr irq               ; ABORT
  .addr nmi               ; NMI
  .word 0
  .addr irq               ; IRQ
  ; エミュレーションモード（$FFF0〜）
  .word 0, 0
  .addr irq               ; COP
  .word 0
  .addr irq               ; ABORT
  .addr nmi               ; NMI
  .addr reset             ; RESET
  .addr irq               ; IRQ/BRK

; ------------------------------------------------------------------ build.py が作ったデータ（スクリプト・文字の窓・画像）
.include "gen.s"
