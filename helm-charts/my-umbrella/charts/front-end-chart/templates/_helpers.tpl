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
Any frontend-specific helper functions can remain here
*/}}