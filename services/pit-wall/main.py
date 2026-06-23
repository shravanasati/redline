from pb.tasks.results_pb2 import MonitorTaskResult  # type: ignore


def main():
    msg = MonitorTaskResult()
    msg.ParseFromString(b"")
    print("Hello from pit-wall!", msg)


if __name__ == "__main__":
    main()
