package main

import (
	"fmt"
	"strings"

	"github.com/shravanasati/redline/services/shared/pb/tasks"
)

var taskTypeMap = map[string]tasks.TaskType{
	"ICMP":  tasks.TaskType_TASK_TYPE_ICMP,
	"HTTP":  tasks.TaskType_TASK_TYPE_HTTP,
	"HTTPS": tasks.TaskType_TASK_TYPE_HTTPS,
	"TCP":   tasks.TaskType_TASK_TYPE_TCP,
	"DNS":   tasks.TaskType_TASK_TYPE_DNS,
}

var httpMethodMap = map[string]tasks.HTTPMethod{
	"GET":  tasks.HTTPMethod_HTTP_METHOD_GET,
	"POST": tasks.HTTPMethod_HTTP_METHOD_POST,
	"HEAD": tasks.HTTPMethod_HTTP_METHOD_HEAD,
}

func mapAssertions(assertions []MonitorAssertion) []*tasks.MonitorAssertion {
	if len(assertions) == 0 {
		return nil
	}
	pbAssertions := make([]*tasks.MonitorAssertion, len(assertions))
	for i, a := range assertions {
		var valStr string
		if a.Value != nil {
			valStr = fmt.Sprintf("%v", a.Value)
		}
		pbAssertions[i] = tasks.MonitorAssertion_builder{
			Target:   &a.Target,
			Operator: &a.Operator,
			Value:    &valStr,
		}.Build()
	}
	return pbAssertions
}

func mapMetadata(m *MonitorMetadata) *tasks.MonitorMetadata {
	if m == nil {
		return nil
	}
	method := tasks.HTTPMethod_HTTP_METHOD_UNSPECIFIED
	if m.Method != "" {
		if mappedMethod, ok := httpMethodMap[strings.ToUpper(m.Method)]; ok {
			method = mappedMethod
		}
	}
	return tasks.MonitorMetadata_builder{
		Headers: m.Headers,
		Method:  method.Enum(),
		Body:    &m.Body,
	}.Build()
}

func buildMonitorTask(m Monitor) (*tasks.MonitorTask, error) {
	taskID, err := m.ID.UUIDValue()
	if err != nil {
		return nil, fmt.Errorf("taskID conversion failed: %w", err)
	}

	task := tasks.MonitorTask_builder{
		Id:         new(taskID.String()),
		Endpoint:   new(m.Endpoint),
		Timeout:    new(int32(m.Timeout)),
		UserId:     new(m.UserID),
		Type:       taskTypeMap[strings.ToUpper(m.Type)].Enum(),
		Assertions: mapAssertions(m.Assertions),
		Metadata:   mapMetadata(m.Metadata),
	}
	return task.Build(), nil
}
