#!/usr/bin/env python3
# ==============================================================================
# BSTM ELOS v1.0 - SCORECARD COMPILER ENGINE
# Programmatically processes markdown directories to track learning quality.
# ==============================================================================
import os
import re
import glob

def extract_front_matter(file_path):
    metadata = {}
    if not os.path.exists(file_path):
        return metadata
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        for line in match.group(1).split('\n'):
            if ':' in line:
                k, v = line.split(':', 1)
                metadata[k.strip()] = v.strip().strip('"').strip("'")
    return metadata

def calculate_metrics():
    trial_files = glob.glob("02_trial_intelligence/*.md")

    total_drift = 0
    total_assumptions = 0
    total_fractures = 0
    total_predictions = 0
    correct_predictions = 0
    inconclusive_count = 0

    for path in trial_files:
        meta = extract_front_matter(path)
        with open(path, 'r', encoding='utf-8') as f:
            body = f.read()

        initials = [int(x) for x in re.findall(r'Initial:\s*(\d)/5', body)]
        finals = [int(x) for x in re.findall(r'Final:\s*(\d)/5', body)]
        for i, fnl in zip(initials, finals):
            total_drift += abs(fnl - i)
            total_assumptions += 1

        if meta.get('trial_outcome') == 'Inconclusive':
            inconclusive_count += 1

        total_fractures += len(re.findall(r'\d\.\s+\*\*The Fracture:\*\*', body, re.IGNORECASE))

        if 'predicted_bottleneck' in meta and 'actual_bottleneck' in meta:
            total_predictions += 1
            if meta['predicted_bottleneck'] == meta['actual_bottleneck']:
                correct_predictions += 1

    p_dir = "04_organizational_principles"
    active = len(glob.glob(os.path.join(p_dir, "active_principles", "*.md")))
    experimental = len(glob.glob(os.path.join(p_dir, "experimental_principles", "*.md")))
    historical = len(glob.glob(os.path.join(p_dir, "historical_principles", "*.md")))
    rejected = len(glob.glob(os.path.join(p_dir, "rejected_principles", "*.md")))

    drift_velocity = total_drift / total_assumptions if total_assumptions > 0 else 0.0
    predictive_accuracy = (correct_predictions / total_predictions * 100) if total_predictions > 0 else 100.0
    uncertainty_rate = (inconclusive_count / len(trial_files) * 100) if trial_files else 0.0
    learning_yield = ((active + rejected) / total_fractures * 100) if total_fractures > 0 else 100.0

    scorecard_path = os.path.join(p_dir, "learning_scorecard.md")
    with open(scorecard_path, 'w', encoding='utf-8') as f:
        f.write(f"""---
scorecard_id: BSTM-METRIC-DASHBOARD
systemic_status: "Active / Self-Correcting"
trials_processed: {len(trial_files)}
---

# BSTM ELOS Dynamic Learning Scorecard

## 1. Core Cognitive Metrics
*   **Belief Drift Velocity (delta B):** {drift_velocity:.2f} points per assumption
*   **Predictive Accuracy (P_acc):** {predictive_accuracy:.1f}%
*   **Systemic Learning Yield (Y_L):** {learning_yield:.1f}%
*   **Uncertainty Isolation Rate (U_rate):** {uncertainty_rate:.1f}%

## 2. Principle Repository Allocation
*   Active Principles: {active}
*   Experimental Principles: {experimental}
*   Historical Principles: {historical}
*   Rejected Principles: {rejected}
""")
    print(f"BSTM Scorecard Updated. Yield: {learning_yield:.1f}% | Drift: {drift_velocity:.2f} | Predictive Accuracy: {predictive_accuracy:.1f}%")

if __name__ == "__main__":
    calculate_metrics()
