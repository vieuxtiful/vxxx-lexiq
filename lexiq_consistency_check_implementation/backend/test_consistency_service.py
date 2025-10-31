"""
Test script for Consistency Check Service
Validates all consistency check types and integration with LexiQ Engine
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from LexiQ_ConsistencyChecker_Type import (
    ConsistencyCheckService,
    ConsistencyCheckType,
    IssueSeverity,
    GlossaryTerm,
    CustomRule
)

def test_whitespace_check():
    """Test whitespace detection"""
    print("\n=== Test 1: Whitespace Check ===")
    
    service = ConsistencyCheckService()
    source = "Hello world"
    target = "  Hola mundo  "  # Leading and trailing spaces
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        check_types=[ConsistencyCheckType.WHITESPACE]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message} (Severity: {issue.severity.value})")
    print(f"Quality Score: {stats.quality_score}")
    
    assert len(issues) >= 1, "Should detect whitespace issues"
    print("✅ Whitespace check passed")


def test_number_consistency():
    """Test number format consistency"""
    print("\n=== Test 2: Number Consistency ===")
    
    service = ConsistencyCheckService()
    source = "The price is $100 and the quantity is 50 units."
    target = "El precio es $100."  # Missing one number
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        check_types=[ConsistencyCheckType.NUMBER_FORMAT]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message}")
        print(f"    Rationale: {issue.rationale}")
    
    assert len(issues) >= 1, "Should detect number mismatch"
    print("✅ Number consistency check passed")


def test_glossary_compliance():
    """Test glossary term compliance"""
    print("\n=== Test 3: Glossary Compliance ===")
    
    service = ConsistencyCheckService()
    source = "The application uses machine learning algorithms."
    target = "La aplicación usa algoritmos de aprendizaje automático."
    
    # Define glossary terms
    glossary = [
        GlossaryTerm(
            id="1",
            source="machine learning",
            target="aprendizaje automático",
            case_sensitive=False
        ),
        GlossaryTerm(
            id="2",
            source="application",
            target="aplicación",
            case_sensitive=False
        )
    ]
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        glossary_terms=glossary,
        check_types=[ConsistencyCheckType.GLOSSARY_COMPLIANCE]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message}")
    print(f"Quality Score: {stats.quality_score}")
    
    print("✅ Glossary compliance check passed")


def test_punctuation_consistency():
    """Test punctuation consistency"""
    print("\n=== Test 4: Punctuation Consistency ===")
    
    service = ConsistencyCheckService()
    source = "What is your name? (Please tell me)"
    target = "¿Cuál es tu nombre? (Por favor dime"  # Missing closing parenthesis
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        check_types=[ConsistencyCheckType.PUNCTUATION]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message}")
        print(f"    Confidence: {issue.confidence}")
    
    assert len(issues) >= 1, "Should detect unbalanced punctuation"
    print("✅ Punctuation consistency check passed")


def test_tag_placeholder_consistency():
    """Test tag and placeholder consistency"""
    print("\n=== Test 5: Tag/Placeholder Consistency ===")
    
    service = ConsistencyCheckService()
    source = "Click <button>here</button> to continue with {0} items."
    target = "Haga clic aquí para continuar con {0} elementos."  # Missing tags
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        check_types=[ConsistencyCheckType.TAG_PLACEHOLDER]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message} (Severity: {issue.severity.value})")
        print(f"    Auto-fixable: {issue.auto_fixable}")
    
    assert len(issues) >= 1, "Should detect missing tags"
    print("✅ Tag/placeholder consistency check passed")


def test_custom_rules():
    """Test custom rule validation"""
    print("\n=== Test 6: Custom Rules ===")
    
    service = ConsistencyCheckService()
    source = "This is a test."
    target = "Esto es una prueba con palabras prohibidas."
    
    # Define custom rules
    custom_rules = [
        CustomRule(
            id="rule1",
            name="Forbidden word",
            type="forbidden",
            pattern="prohibidas",
            description="This word should not be used",
            severity=IssueSeverity.CRITICAL
        ),
        CustomRule(
            id="rule2",
            name="Required phrase",
            type="required",
            pattern="obligatorio",
            description="This phrase must appear",
            severity=IssueSeverity.MAJOR
        )
    ]
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        custom_rules=custom_rules,
        check_types=[ConsistencyCheckType.CUSTOM_RULE]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message} (Rule: {issue.rule_id})")
        print(f"    Severity: {issue.severity.value}")
    
    assert len(issues) >= 2, "Should detect forbidden word and missing required phrase"
    print("✅ Custom rules check passed")


def test_segment_alignment():
    """Test segment alignment"""
    print("\n=== Test 7: Segment Alignment ===")
    
    service = ConsistencyCheckService()
    source = "First sentence. Second sentence. Third sentence."
    target = "Primera oración. Segunda oración."  # Missing one sentence
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        check_types=[ConsistencyCheckType.SEGMENT_ALIGNMENT]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message}")
        print(f"    Rationale: {issue.rationale}")
    
    assert len(issues) >= 1, "Should detect segment count mismatch"
    print("✅ Segment alignment check passed")


def test_capitalization_consistency():
    """Test capitalization consistency"""
    print("\n=== Test 8: Capitalization Consistency ===")
    
    service = ConsistencyCheckService()
    source = "Python is great. Python is powerful."
    target = "Python es genial. python es poderoso."  # Inconsistent capitalization
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        check_types=[ConsistencyCheckType.CAPITALIZATION]
    )
    
    print(f"Issues found: {len(issues)}")
    for issue in issues:
        print(f"  - {issue.message}")
        print(f"    Suggestions: {issue.suggestions}")
        print(f"    Auto-fixable: {issue.auto_fixable}")
    
    print("✅ Capitalization consistency check passed")


def test_comprehensive_analysis():
    """Test comprehensive analysis with all check types"""
    print("\n=== Test 9: Comprehensive Analysis ===")
    
    service = ConsistencyCheckService()
    source = "The total is $100. Click <button>here</button> to proceed."
    target = "  El total es 100 euros. Haga clic aquí para continuar.  "
    
    issues, stats = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        check_types=None  # All checks
    )
    
    print(f"Total issues found: {stats.total_issues}")
    print(f"  Critical: {stats.critical_issues}")
    print(f"  Major: {stats.major_issues}")
    print(f"  Minor: {stats.minor_issues}")
    print(f"  Info: {stats.info_issues}")
    print(f"\nIssues by type:")
    for check_type, count in stats.issues_by_type.items():
        if count > 0:
            print(f"  {check_type}: {count}")
    print(f"\nQuality Score: {stats.quality_score:.2f}/100")
    print(f"Average Confidence: {stats.average_confidence:.2f}")
    
    print("\nDetailed issues:")
    for issue in issues:
        print(f"  [{issue.severity.value.upper()}] {issue.type.value}: {issue.message}")
    
    print("✅ Comprehensive analysis passed")


def test_caching():
    """Test caching functionality"""
    print("\n=== Test 10: Caching ===")
    
    service = ConsistencyCheckService()
    source = "Test caching"
    target = "Prueba de caché"
    
    # First call - should analyze
    import time
    start1 = time.time()
    issues1, stats1 = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        enable_cache=True
    )
    time1 = time.time() - start1
    
    # Second call - should use cache
    start2 = time.time()
    issues2, stats2 = service.check_consistency(
        source_text=source,
        translation_text=target,
        source_language="en",
        target_language="es",
        enable_cache=True
    )
    time2 = time.time() - start2
    
    print(f"First call time: {time1:.4f}s")
    print(f"Second call time: {time2:.4f}s")
    print(f"Cache entries: {len(service.cache)}")
    
    assert len(issues1) == len(issues2), "Cached results should match"
    print("✅ Caching test passed")


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("CONSISTENCY CHECK SERVICE TEST SUITE")
    print("=" * 60)
    
    tests = [
        test_whitespace_check,
        test_number_consistency,
        test_glossary_compliance,
        test_punctuation_consistency,
        test_tag_placeholder_consistency,
        test_custom_rules,
        test_segment_alignment,
        test_capitalization_consistency,
        test_comprehensive_analysis,
        test_caching
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"TEST RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
