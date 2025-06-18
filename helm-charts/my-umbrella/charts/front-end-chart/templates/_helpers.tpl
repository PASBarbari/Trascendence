{{/*
Import common library templates - helpers are automatically made available by the library chart
*/}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "front-end-chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Get the namespace name (supports both old and new format)
*/}}
{{- define "front-end-chart.namespace" -}}
{{- if .Values.namespace.name -}}
{{- .Values.namespace.name -}}
{{- else -}}
{{- .Values.namespace -}}
{{- end -}}
{{- end -}}

// ...existing code...