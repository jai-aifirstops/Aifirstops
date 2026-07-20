# Master resume drop folder

Place your real resume here as PDF, DOCX, Markdown, or plain text.

When exactly one resume file is present:

```bash
python -m src.cli import-resume --auto
```

Or pass an explicit path:

```bash
python -m src.cli import-resume "resumes/master/JXTG RES.pdf"
```

Do **not** copy `tests/fixtures/sample_resume.*` here; those files are synthetic test data only.
