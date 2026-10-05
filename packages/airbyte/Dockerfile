FROM airbyte/python-connector-base:4.1.1@sha256:a268b44c733ae699a60f5fbc06a324945dba98945c6e2ab7f8609f2f895b0d28 AS dependencies
WORKDIR /build
COPY requirements.lock ./
COPY wheelhouse ./wheelhouse
RUN python -m venv /opt/arcmira && /opt/arcmira/bin/python -m pip install --disable-pip-version-check --no-cache-dir --no-index --find-links=wheelhouse --only-binary=:all: --require-hashes -r requirements.lock && /opt/arcmira/bin/python -m pip check

FROM airbyte/python-connector-base:4.1.1@sha256:a268b44c733ae699a60f5fbc06a324945dba98945c6e2ab7f8609f2f895b0d28
COPY --from=dependencies /opt/arcmira /opt/arcmira
WORKDIR /airbyte/integration_code
COPY source_arcmira.py spec.json LICENSE ./
COPY schemas ./schemas
ENV PATH="/opt/arcmira/bin:${PATH}" PYTHONDONTWRITEBYTECODE=1 AIRBYTE_ENTRYPOINT="python /airbyte/integration_code/source_arcmira.py"
USER airbyte
ENTRYPOINT ["python", "/airbyte/integration_code/source_arcmira.py"]
