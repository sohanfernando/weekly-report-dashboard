package com.sisenco.weeklyreport.dto.response;

import java.util.List;

/**
 * The assistant's answer.
 *
 * @param reply prose, already grounded in whatever the tools returned
 * @param toolsUsed which lookups ran, in order. Surfaced so the interface can
 *     show that an answer came from the database rather than from the model —
 *     an assistant that cites nothing is hard to trust.
 * @param model the model that answered, so the deployed configuration is visible
 *     without reading the logs
 */
public record ChatResponse(String reply, List<String> toolsUsed, String model) {}
