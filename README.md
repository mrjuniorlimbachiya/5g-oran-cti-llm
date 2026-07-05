# LLM-Assisted Cyber Threat Intelligence for 5G O-RAN Security

PhD coding exercise — UCD NetsLab. Uses the **NetsLab-5GORAN-IDD** dataset to train a
threat-detection model, generate structured CTI alerts, and enrich them with a locally
hosted LLM.

## Project structure

```
oran-cti/
├── data/
│   ├── raw/            # put the downloaded Kaggle CSV(s) here (untouched)
│   └── processed/       # pipeline outputs (test predictions, CTI alerts)
├── models/               # saved trained model + encoders
├── notebooks/
│   └── 01_threat_detection_model.ipynb   # Part 1: detection model
├── outputs/              # figures for the report (confusion matrix, etc.)
├── sample_data/           # small synthetic CSV, ONLY for smoke-testing the pipeline
│                          # before the real dataset is downloaded -- do not use this
│                          # for your actual results.
├── requirements.txt
└── README.md
```

## 1. Setup

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Download the dataset

The dataset lives on Kaggle: https://www.kaggle.com/datasets/netslabdemo/netslab-5g-oran-idd
(DOI: 10.34740/kaggle/ds/7416931)

Using the Kaggle CLI (you'll need a Kaggle account + API token — `~/.kaggle/kaggle.json`,
see https://www.kaggle.com/docs/api for how to generate one):

```bash
kaggle datasets download -d netslabdemo/netslab-5g-oran-idd -p data/raw --unzip
```

Or download the ZIP manually from the Kaggle page and extract it into `data/raw/`.

## 3. Run Part 1

```bash
cd notebooks
jupyter notebook 01_threat_detection_model.ipynb
```

**Confirmed real file:** the archive's top-level `Network_Dataset.csv` (comma-separated,
~1.72M rows) is a Zeek-style conn log with an explicit `attack_category` label column
(`benign`, `dos`, `ddos`, `web`, `probe`, `bruteforce`) — this is what the notebook is
configured against. Put just this file in `data/raw/` (you don't need the 132GB of raw
per-class folders or `Lower_Layer_Data`, since `attack_category` already gives clean labels
for every class).

**Important — label leakage:** the raw file also has `attack_type` (a finer-grained version
of the label) and `traffic_type` (a binary benign/attack flag derived from the label). Both
are explicitly excluded from the model's feature set (`LEAKAGE_COLS` in the config cell) —
leaving them in would let the model read the answer directly instead of learning from actual
network behaviour. They're still carried through in `df` for context in the CTI alert later.

The notebook still auto-discovers CSVs under `data/raw/` (so it'll pick up
`Network_Dataset.csv` automatically), with a filename-based label-inference fallback kept in
for robustness in case you end up needing to bring in one of the per-class folders later.

### Quick smoke test (optional)

To verify your environment works before wrestling with the real dataset, you can point
`RAW_DATA_DIR` at `../sample_data` temporarily — it contains a small synthetic CSV shaped
like a Zeek-style flow log (benign + 3 synthetic attack classes) purely for pipeline
validation. **Do not use this for your submitted results.**

## 4. Outputs

Running the notebook produces:
- `outputs/class_distribution.png`, `outputs/confusion_matrix.png`, `outputs/feature_importance.png`
- `models/threat_classifier.pkl` — trained model + encoders, used by Part 2
- `data/processed/test_predictions.json` — per-test-event predicted class, confidence,
  top-3 alternatives, and raw feature snapshot (true label kept only for offline evaluation,
  never passed to the LLM in Part 2)
