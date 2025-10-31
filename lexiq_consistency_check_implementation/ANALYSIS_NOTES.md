# LQA Engine統合分析ノート

## 現在の実装状況

### 1. useLQASyncフック (`src/hooks/useLQASync.tsx`)

**現在の機能:**
- ソースとターゲットコンテンツの双方向分析
- Supabase Edge Function (`analyze-translation`) を使用
- 文法とスペルチェックに焦点
- 2秒のデバウンス処理
- LQASyncIssue型でissuesを返す

**制限事項:**
- Consistency Checkは限定的（主に文法・スペルのみ）
- ブラウザベースの処理に依存
- 用語集との統合が不完全
- カスタムルールシステムとの分離
- バッチ処理やキャッシングなし

### 2. Supabase Edge Function (`supabase/functions/analyze-translation/index.ts`)

**現在の機能:**
- Lovable AI API (Gemini 2.5 Flash) を使用
- 文法・スペルチェック
- ソースのみ分析モード (`sourceTextOnly`)
- 数字、タグ、空白のチェック
- 最大50,000文字まで対応

**制限事項:**
- Consistency Check機能が限定的
- 用語集の堅牢な統合なし
- カスタムルールの適用なし
- パターンベースのチェックが不完全

### 3. バックエンド構造

**既存のPythonバックエンド:**
- `backend/hot_match_api.py`
- `backend/hot_match_detector.py`
- `backend/hot_match_service.py`

**Supabase Edge Functions:**
- `analyze-translation`
- `detect-language`
- `generate-report`
- `process-files`
- `qa-chat`

## 提案される実装計画

### Phase 1: バックエンドAPI契約の定義

**新しいエンドポイント:** `consistency-check`

**入力:**
```typescript
{
  sourceText: string;
  translationText: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaryTerms?: GlossaryTerm[];
  customRules?: CustomRule[];
  checkTypes?: ConsistencyCheckType[];
}
```

**出力:**
```typescript
{
  issues: ConsistencyIssue[];
  statistics: ConsistencyStatistics;
  cacheKey: string;
}
```

### Phase 2: バックエンドロジックの実装

**Pythonサービス:** `backend/LexiQ_ConsistencyChecker_Type.py`

**機能:**
1. トークン化とアライメント
2. 用語抽出と用語集ルックアップ
3. パターンベースチェック
   - 句読点の一貫性
   - 数字の形式
   - 空白の問題
   - タグ/プレースホルダーの一貫性
4. ルールベースチェック
5. スコアリングとカテゴリ化

### Phase 3: フロントエンド統合

**新しいフック:** `useConsistencyChecks`

**統合ポイント:**
- `useLQASync`を拡張または置き換え
- 既存のUIを維持
- ローディング/エラー状態の追加
- オフライン/オンラインモードの切り替え

### Phase 4: 用語集とカスタムルールの統合

**実装:**
- 用語集エントリをバックエンドに送信
- 有効なカスタムルールを分析に適用
- 用語の一貫性チェックを強化

### Phase 5: パフォーマンスとUX

**最適化:**
- 大規模ドキュメントのバッチリクエスト
- コンテンツハッシュによるキャッシング
- "すべて修正"機能の実装
- 自動修正のバックエンドサポート

### Phase 6: プラガブルエンジン

**アーキテクチャ:**
- ブラウザベースとバックエンド実装の切り替え
- プロジェクトごとの設定
- オフラインモードのサポート

## 次のステップ

1. ✅ 現在の実装の分析完了
2. ⏳ バックエンドAPI契約の定義
3. ⏳ Pythonサービスの実装
4. ⏳ フロントエンドフックの更新
5. ⏳ テストと検証
