package com.sisenco.weeklyreport;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WeeklyreportApplication {

    public static void main(String[] args) {
        SpringApplication.run(WeeklyreportApplication.class, args);
    }
}
