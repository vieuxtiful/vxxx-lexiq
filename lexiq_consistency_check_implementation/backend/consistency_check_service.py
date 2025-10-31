"""
Consistency Check Service for LexiQ AI XLQA
Provides comprehensive LQA checks including segment alignment, glossary compliance,
punctuation, numbers, whitespace, tags, and custom rules.
"""

import re
import hashlib
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum


class LexiQ_ConsistencyChecker_Type(str, Enum):
    SEGMENT_ALIGNMENT = "segment_alignment"
    GLOSSARY_COMPLIANCE = "glossary_compliance"
    CAPITALIZATION = "capitalization"
    PUNCTUATION = "punctuation"
    NUMBER_FORMAT = "number_format"
    WHITESPACE = "whitespace"
    TAG_PLACEHOLDER = "tag_placeholder"
    GRAMMAR = "grammar"
    SPELLING = "spelling"
    CUSTOM_RULE = "custom_rule"


class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    INFO = "info"


@dataclass
class GlossaryTerm:
    id: str
    source: str
    target: str
    domain: Optional[str] = None
    case_sensitive: bool = False
    forbidden: bool = False


@dataclass
class CustomRule:
    id: str
    name: str
    type: str  # 'regex', 'forbidden', 'required'
    pattern: str
    description: str
    replacement: Optional[str] = None
    severity: IssueSeverity = IssueSeverity.MINOR
    enabled: bool = True


@dataclass
class ConsistencyIssue:
    id: str
    type: LexiQ_ConsistencyChecker_Type
    severity: IssueSeverity
    target_text: str
    start_position: int
    end_position: int
    context: str
    message: str
    rationale: str
    suggestions: List[str]
    confidence: float
    auto_fixable: bool
    source_text: Optional[str] = None
    rule_id: Optional[str] = None


@dataclass
class ConsistencyStatistics:
    total_issues: int
    critical_issues: int
    major_issues: int
    minor_issues: int
    info_issues: int
    issues_by_type: Dict[str, int]
    quality_score: float
    average_confidence: float


class ConsistencyCheckService:
    """Main service for performing consistency checks on translation content."""

    def __init__(self):
        self.cache: Dict[str, Dict] = {}

    def generate_cache_key(self, source: str, target: str, language_pair: str) -> str:
        """Generate a cache key based on content hash."""
        content = f"{source}|{target}|{language_pair}"
        return hashlib.md5(content.encode()).hexdigest()

    def check_consistency(
        self,
        source_text: str,
        translation_text: str,
        source_language: str,
        target_language: str,
        glossary_terms: Optional[List[GlossaryTerm]] = None,
        custom_rules: Optional[List[CustomRule]] = None,
        check_types: Optional[List[LexiQ_ConsistencyChecker_Type]] = None,
        enable_cache: bool = True
    ) -> Tuple[List[ConsistencyIssue], ConsistencyStatistics]:
        """
        Perform comprehensive consistency checks on translation content.
        
        Args:
            source_text: Source language text
            translation_text: Target language text
            source_language: Source language code
            target_language: Target language code
            glossary_terms: Optional list of glossary terms to check
            custom_rules: Optional list of custom rules to apply
            check_types: Optional list of specific check types to perform
            enable_cache: Whether to use caching
            
        Returns:
            Tuple of (issues list, statistics)
        """
        # Check cache
        if enable_cache:
            cache_key = self.generate_cache_key(
                source_text, translation_text, f"{source_language}-{target_language}"
            )
            if cache_key in self.cache:
                cached = self.cache[cache_key]
                return cached['issues'], cached['statistics']

        issues: List[ConsistencyIssue] = []
        
        # Determine which checks to run
        if check_types is None:
            check_types = list(LexiQ_ConsistencyChecker_Type)

        # Run each check type
        if LexiQ_ConsistencyChecker_Type.SEGMENT_ALIGNMENT in check_types:
            issues.extend(self._check_segment_alignment(source_text, translation_text))

        if LexiQ_ConsistencyChecker_Type.GLOSSARY_COMPLIANCE in check_types and glossary_terms:
            issues.extend(self._check_glossary_compliance(
                source_text, translation_text, glossary_terms
            ))

        if LexiQ_ConsistencyChecker_Type.CAPITALIZATION in check_types:
            issues.extend(self._check_capitalization(source_text, translation_text))

        if LexiQ_ConsistencyChecker_Type.PUNCTUATION in check_types:
            issues.extend(self._check_punctuation(source_text, translation_text))

        if LexiQ_ConsistencyChecker_Type.NUMBER_FORMAT in check_types:
            issues.extend(self._check_number_format(source_text, translation_text))

        if LexiQ_ConsistencyChecker_Type.WHITESPACE in check_types:
            issues.extend(self._check_whitespace(translation_text))

        if LexiQ_ConsistencyChecker_Type.TAG_PLACEHOLDER in check_types:
            issues.extend(self._check_tags_placeholders(source_text, translation_text))

        if LexiQ_ConsistencyChecker_Type.CUSTOM_RULE in check_types and custom_rules:
            issues.extend(self._check_custom_rules(translation_text, custom_rules))

        # Calculate statistics
        statistics = self._calculate_statistics(issues)

        # Cache results
        if enable_cache:
            self.cache[cache_key] = {
                'issues': issues,
                'statistics': statistics
            }

        return issues, statistics

    def _check_segment_alignment(
        self, source: str, target: str
    ) -> List[ConsistencyIssue]:
        """Check for segment alignment issues between source and target."""
        issues = []
        
        # Split into sentences
        source_sentences = self._split_sentences(source)
        target_sentences = self._split_sentences(target)
        
        # Check if counts match
        if len(source_sentences) != len(target_sentences):
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.SEGMENT_ALIGNMENT,
                severity=IssueSeverity.MAJOR,
                target_text=target,
                start_position=0,
                end_position=len(target),
                context=target[:100],
                message=f"Segment count mismatch: {len(source_sentences)} source vs {len(target_sentences)} target",
                rationale="The number of sentences in source and target do not match, indicating potential missing or extra content",
                suggestions=["Review segment alignment and ensure all source segments are translated"],
                confidence=0.9,
                auto_fixable=False,
                source_text=source[:100]
            ))
        
        return issues

    def _check_glossary_compliance(
        self, source: str, target: str, glossary_terms: List[GlossaryTerm]
    ) -> List[ConsistencyIssue]:
        """Check compliance with glossary terms."""
        issues = []
        
        for term in glossary_terms:
            # Check if source term exists
            if term.case_sensitive:
                source_matches = [m.start() for m in re.finditer(re.escape(term.source), source)]
            else:
                source_matches = [m.start() for m in re.finditer(re.escape(term.source), source, re.IGNORECASE)]
            
            if not source_matches:
                continue
            
            # Check if target term is used correctly
            if term.case_sensitive:
                target_matches = list(re.finditer(re.escape(term.target), target))
            else:
                target_matches = list(re.finditer(re.escape(term.target), target, re.IGNORECASE))
            
            # Check for forbidden terms
            if term.forbidden and target_matches:
                for match in target_matches:
                    issues.append(ConsistencyIssue(
                        id=self._generate_issue_id(),
                        type=LexiQ_ConsistencyChecker_Type.GLOSSARY_COMPLIANCE,
                        severity=IssueSeverity.CRITICAL,
                        target_text=match.group(),
                        start_position=match.start(),
                        end_position=match.end(),
                        context=self._extract_context(target, match.start(), match.end()),
                        message=f"Forbidden term used: '{term.target}'",
                        rationale=f"The term '{term.target}' is marked as forbidden in the glossary",
                        suggestions=[f"Remove or replace '{term.target}'"],
                        confidence=1.0,
                        auto_fixable=False,
                        source_text=term.source
                    ))
            
            # Check for missing required terms
            elif not term.forbidden and len(source_matches) > len(target_matches):
                issues.append(ConsistencyIssue(
                    id=self._generate_issue_id(),
                    type=LexiQ_ConsistencyChecker_Type.GLOSSARY_COMPLIANCE,
                    severity=IssueSeverity.MAJOR,
                    target_text=target[:100],
                    start_position=0,
                    end_position=len(target),
                    context=target[:100],
                    message=f"Glossary term '{term.target}' appears fewer times than source term '{term.source}'",
                    rationale=f"Expected {len(source_matches)} occurrences but found {len(target_matches)}",
                    suggestions=[f"Ensure all instances of '{term.source}' are translated as '{term.target}'"],
                    confidence=0.85,
                    auto_fixable=False,
                    source_text=term.source
                ))
        
        return issues

    def _check_capitalization(self, source: str, target: str) -> List[ConsistencyIssue]:
        """Check for capitalization consistency issues."""
        issues = []
        
        # Check for inconsistent capitalization of repeated words
        words = re.findall(r'\b[A-Z][a-z]+\b', target)
        word_positions: Dict[str, List[Tuple[int, str]]] = {}
        
        for match in re.finditer(r'\b[A-Z][a-z]+\b', target):
            word_lower = match.group().lower()
            if word_lower not in word_positions:
                word_positions[word_lower] = []
            word_positions[word_lower].append((match.start(), match.group()))
        
        # Find words with inconsistent capitalization
        for word_lower, positions in word_positions.items():
            if len(positions) > 1:
                capitalizations = set(word for _, word in positions)
                if len(capitalizations) > 1:
                    # Found inconsistent capitalization
                    for pos, word in positions[1:]:
                        if word != positions[0][1]:
                            issues.append(ConsistencyIssue(
                                id=self._generate_issue_id(),
                                type=LexiQ_ConsistencyChecker_Type.CAPITALIZATION,
                                severity=IssueSeverity.MINOR,
                                target_text=word,
                                start_position=pos,
                                end_position=pos + len(word),
                                context=self._extract_context(target, pos, pos + len(word)),
                                message=f"Inconsistent capitalization: '{word}' vs '{positions[0][1]}'",
                                rationale="The same word appears with different capitalization patterns",
                                suggestions=[positions[0][1]],
                                confidence=0.7,
                                auto_fixable=True
                            ))
        
        return issues

    def _check_punctuation(self, source: str, target: str) -> List[ConsistencyIssue]:
        """Check for punctuation consistency between source and target."""
        issues = []
        
        # Extract punctuation marks
        source_punct = set(re.findall(r'[.,;:!?()"\'\[\]{}]', source))
        target_punct = set(re.findall(r'[.,;:!?()"\'\[\]{}]', target))
        
        # Check for missing punctuation types
        missing_punct = source_punct - target_punct
        if missing_punct:
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.PUNCTUATION,
                severity=IssueSeverity.MINOR,
                target_text=target[:100],
                start_position=0,
                end_position=len(target),
                context=target[:100],
                message=f"Missing punctuation types: {', '.join(missing_punct)}",
                rationale="Some punctuation marks present in source are missing in target",
                suggestions=[f"Review if punctuation marks {', '.join(missing_punct)} should be included"],
                confidence=0.6,
                auto_fixable=False
            ))
        
        # Check for unbalanced quotes and brackets
        for open_char, close_char in [('(', ')'), ('[', ']'), ('{', '}'), ('"', '"')]:
            open_count = target.count(open_char)
            close_count = target.count(close_char)
            if open_count != close_count:
                issues.append(ConsistencyIssue(
                    id=self._generate_issue_id(),
                    type=LexiQ_ConsistencyChecker_Type.PUNCTUATION,
                    severity=IssueSeverity.MAJOR,
                    target_text=target[:100],
                    start_position=0,
                    end_position=len(target),
                    context=target[:100],
                    message=f"Unbalanced {open_char}{close_char}: {open_count} opening vs {close_count} closing",
                    rationale="Mismatched opening and closing punctuation marks",
                    suggestions=[f"Ensure all {open_char} have matching {close_char}"],
                    confidence=0.95,
                    auto_fixable=False
                ))
        
        return issues

    def _check_number_format(self, source: str, target: str) -> List[ConsistencyIssue]:
        """Check for number format consistency."""
        issues = []
        
        # Extract numbers
        source_numbers = re.findall(r'\d+(?:[.,]\d+)*', source)
        target_numbers = re.findall(r'\d+(?:[.,]\d+)*', target)
        
        # Check if number counts match
        if len(source_numbers) != len(target_numbers):
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.NUMBER_FORMAT,
                severity=IssueSeverity.MAJOR,
                target_text=target[:100],
                start_position=0,
                end_position=len(target),
                context=target[:100],
                message=f"Number count mismatch: {len(source_numbers)} in source vs {len(target_numbers)} in target",
                rationale="The number of numeric values differs between source and target",
                suggestions=["Verify all numbers are correctly translated"],
                confidence=0.9,
                auto_fixable=False,
                source_text=', '.join(source_numbers)
            ))
        
        return issues

    def _check_whitespace(self, target: str) -> List[ConsistencyIssue]:
        """Check for whitespace issues."""
        issues = []
        
        # Check for leading/trailing whitespace
        if target.startswith(' ') or target.startswith('\t'):
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.WHITESPACE,
                severity=IssueSeverity.MINOR,
                target_text=target[:10],
                start_position=0,
                end_position=1,
                context=target[:50],
                message="Leading whitespace detected",
                rationale="Text begins with unnecessary whitespace",
                suggestions=["Remove leading whitespace"],
                confidence=1.0,
                auto_fixable=True
            ))
        
        if target.endswith(' ') or target.endswith('\t'):
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.WHITESPACE,
                severity=IssueSeverity.MINOR,
                target_text=target[-10:],
                start_position=len(target) - 1,
                end_position=len(target),
                context=target[-50:],
                message="Trailing whitespace detected",
                rationale="Text ends with unnecessary whitespace",
                suggestions=["Remove trailing whitespace"],
                confidence=1.0,
                auto_fixable=True
            ))
        
        # Check for multiple consecutive spaces
        for match in re.finditer(r'  +', target):
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.WHITESPACE,
                severity=IssueSeverity.MINOR,
                target_text=match.group(),
                start_position=match.start(),
                end_position=match.end(),
                context=self._extract_context(target, match.start(), match.end()),
                message=f"Multiple consecutive spaces ({len(match.group())} spaces)",
                rationale="Multiple spaces should typically be reduced to a single space",
                suggestions=[" "],
                confidence=0.95,
                auto_fixable=True
            ))
        
        return issues

    def _check_tags_placeholders(self, source: str, target: str) -> List[ConsistencyIssue]:
        """Check for tag and placeholder consistency."""
        issues = []
        
        # Extract XML/HTML tags
        source_tags = re.findall(r'<[^>]+>', source)
        target_tags = re.findall(r'<[^>]+>', target)
        
        # Check tag counts
        if len(source_tags) != len(target_tags):
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.TAG_PLACEHOLDER,
                severity=IssueSeverity.CRITICAL,
                target_text=target[:100],
                start_position=0,
                end_position=len(target),
                context=target[:100],
                message=f"Tag count mismatch: {len(source_tags)} in source vs {len(target_tags)} in target",
                rationale="XML/HTML tags must be preserved between source and target",
                suggestions=["Ensure all tags from source are present in target"],
                confidence=1.0,
                auto_fixable=False,
                source_text=', '.join(source_tags)
            ))
        
        # Extract placeholders (e.g., {0}, %s, ${var})
        source_placeholders = re.findall(r'\{[^}]+\}|%[sd]|\$\{[^}]+\}', source)
        target_placeholders = re.findall(r'\{[^}]+\}|%[sd]|\$\{[^}]+\}', target)
        
        if len(source_placeholders) != len(target_placeholders):
            issues.append(ConsistencyIssue(
                id=self._generate_issue_id(),
                type=LexiQ_ConsistencyChecker_Type.TAG_PLACEHOLDER,
                severity=IssueSeverity.CRITICAL,
                target_text=target[:100],
                start_position=0,
                end_position=len(target),
                context=target[:100],
                message=f"Placeholder count mismatch: {len(source_placeholders)} in source vs {len(target_placeholders)} in target",
                rationale="Placeholders must be preserved between source and target",
                suggestions=["Ensure all placeholders from source are present in target"],
                confidence=1.0,
                auto_fixable=False,
                source_text=', '.join(source_placeholders)
            ))
        
        return issues

    def _check_custom_rules(
        self, target: str, custom_rules: List[CustomRule]
    ) -> List[ConsistencyIssue]:
        """Check custom rules against target text."""
        issues = []
        
        for rule in custom_rules:
            if not rule.enabled:
                continue
            
            if rule.type == 'regex':
                for match in re.finditer(rule.pattern, target):
                    suggestions = [rule.replacement] if rule.replacement else []
                    issues.append(ConsistencyIssue(
                        id=self._generate_issue_id(),
                        type=LexiQ_ConsistencyChecker_Type.CUSTOM_RULE,
                        severity=rule.severity,
                        target_text=match.group(),
                        start_position=match.start(),
                        end_position=match.end(),
                        context=self._extract_context(target, match.start(), match.end()),
                        message=f"Custom rule violation: {rule.name}",
                        rationale=rule.description,
                        suggestions=suggestions,
                        confidence=0.8,
                        auto_fixable=bool(rule.replacement),
                        rule_id=rule.id
                    ))
            
            elif rule.type == 'forbidden':
                for match in re.finditer(rule.pattern, target, re.IGNORECASE):
                    issues.append(ConsistencyIssue(
                        id=self._generate_issue_id(),
                        type=LexiQ_ConsistencyChecker_Type.CUSTOM_RULE,
                        severity=IssueSeverity.CRITICAL,
                        target_text=match.group(),
                        start_position=match.start(),
                        end_position=match.end(),
                        context=self._extract_context(target, match.start(), match.end()),
                        message=f"Forbidden term detected: {rule.name}",
                        rationale=rule.description,
                        suggestions=["Remove or replace this term"],
                        confidence=1.0,
                        auto_fixable=False,
                        rule_id=rule.id
                    ))
            
            elif rule.type == 'required':
                if not re.search(rule.pattern, target, re.IGNORECASE):
                    issues.append(ConsistencyIssue(
                        id=self._generate_issue_id(),
                        type=LexiQ_ConsistencyChecker_Type.CUSTOM_RULE,
                        severity=rule.severity,
                        target_text=target[:100],
                        start_position=0,
                        end_position=len(target),
                        context=target[:100],
                        message=f"Required term missing: {rule.name}",
                        rationale=rule.description,
                        suggestions=[f"Add required term matching pattern: {rule.pattern}"],
                        confidence=0.9,
                        auto_fixable=False,
                        rule_id=rule.id
                    ))
        
        return issues

    def _calculate_statistics(
        self, issues: List[ConsistencyIssue]
    ) -> ConsistencyStatistics:
        """Calculate statistics from issues list."""
        total = len(issues)
        critical = sum(1 for i in issues if i.severity == IssueSeverity.CRITICAL)
        major = sum(1 for i in issues if i.severity == IssueSeverity.MAJOR)
        minor = sum(1 for i in issues if i.severity == IssueSeverity.MINOR)
        info = sum(1 for i in issues if i.severity == IssueSeverity.INFO)
        
        issues_by_type: Dict[str, int] = {}
        for issue_type in LexiQ_ConsistencyChecker_Type:
            issues_by_type[issue_type.value] = sum(
                1 for i in issues if i.type == issue_type
            )
        
        # Calculate quality score (0-100)
        if total == 0:
            quality_score = 100.0
        else:
            # Weight by severity
            weighted_issues = (critical * 10) + (major * 5) + (minor * 2) + (info * 1)
            quality_score = max(0, 100 - weighted_issues)
        
        # Calculate average confidence
        avg_confidence = (
            sum(i.confidence for i in issues) / total
            if total > 0 else 1.0
        )
        
        return ConsistencyStatistics(
            total_issues=total,
            critical_issues=critical,
            major_issues=major,
            minor_issues=minor,
            info_issues=info,
            issues_by_type=issues_by_type,
            quality_score=quality_score,
            average_confidence=avg_confidence
        )

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences, handling CJK and Western languages."""
        # CJK sentence terminators
        cjk_pattern = r'[。！？]'
        # Western sentence terminators
        western_pattern = r'[.!?](?=\s+[A-Z]|\s*$)'
        
        # Check if text contains CJK characters
        if re.search(r'[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]', text):
            sentences = re.split(cjk_pattern, text)
        else:
            sentences = re.split(western_pattern, text)
        
        return [s.strip() for s in sentences if s.strip()]

    def _extract_context(self, text: str, start: int, end: int, window: int = 50) -> str:
        """Extract context around a position in text."""
        context_start = max(0, start - window)
        context_end = min(len(text), end + window)
        
        context = text[context_start:context_end]
        
        if context_start > 0:
            context = '...' + context
        if context_end < len(text):
            context = context + '...'
        
        return context

    def _generate_issue_id(self) -> str:
        """Generate a unique issue ID."""
        import uuid
        return str(uuid.uuid4())


# Utility functions for API integration

def dict_to_glossary_term(data: dict) -> GlossaryTerm:
    """Convert dictionary to GlossaryTerm object."""
    return GlossaryTerm(
        id=data.get('id', ''),
        source=data.get('source', ''),
        target=data.get('target', ''),
        domain=data.get('domain'),
        case_sensitive=data.get('caseSensitive', False),
        forbidden=data.get('forbidden', False)
    )


def dict_to_custom_rule(data: dict) -> CustomRule:
    """Convert dictionary to CustomRule object."""
    return CustomRule(
        id=data.get('id', ''),
        name=data.get('name', ''),
        type=data.get('type', 'regex'),
        pattern=data.get('pattern', ''),
        replacement=data.get('replacement'),
        description=data.get('description', ''),
        severity=IssueSeverity(data.get('severity', 'minor')),
        enabled=data.get('enabled', True)
    )


def issue_to_dict(issue: ConsistencyIssue) -> dict:
    """Convert ConsistencyIssue to dictionary for JSON serialization."""
    return {
        'id': issue.id,
        'type': issue.type.value,
        'severity': issue.severity.value,
        'targetText': issue.target_text,
        'startPosition': issue.start_position,
        'endPosition': issue.end_position,
        'context': issue.context,
        'message': issue.message,
        'rationale': issue.rationale,
        'suggestions': issue.suggestions,
        'confidence': issue.confidence,
        'autoFixable': issue.auto_fixable,
        'sourceText': issue.source_text,
        'ruleId': issue.rule_id
    }


def statistics_to_dict(stats: ConsistencyStatistics) -> dict:
    """Convert ConsistencyStatistics to dictionary for JSON serialization."""
    return {
        'totalIssues': stats.total_issues,
        'criticalIssues': stats.critical_issues,
        'majorIssues': stats.major_issues,
        'minorIssues': stats.minor_issues,
        'infoIssues': stats.info_issues,
        'issuesByType': stats.issues_by_type,
        'qualityScore': stats.quality_score,
        'averageConfidence': stats.average_confidence
    }
