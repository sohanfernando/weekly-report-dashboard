package com.sisenco.weeklyreport;

import org.springframework.boot.SpringApplication;

public class TestWeeklyreportApplication {

	public static void main(String[] args) {
		SpringApplication.from(WeeklyreportApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
