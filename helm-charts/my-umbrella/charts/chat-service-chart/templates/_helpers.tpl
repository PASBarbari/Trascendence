{{/*
Import common library templates - helpers are automatically made available by the library chart
*/}}

{{/*
Any chart-specific helpers that aren't covered by the common library can go here.
The common helpers should handle most cases, but if you need something specific:
*/}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "chat-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}