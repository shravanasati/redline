package main

import "fmt"
import "github.com/shravanasati/redline/services/shared/pb/tasks"
import "google.golang.org/protobuf/proto"

func main() {
	task := tasks.MonitorTask_builder{Id: proto.String("gre")}.Build()
	fmt.Println(task)
}
