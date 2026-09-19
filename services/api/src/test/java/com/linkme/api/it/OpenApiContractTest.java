package com.linkme.api.it;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.yaml.snakeyaml.Yaml;

/** Contract-first (ADR 0003, D18) : chaque opération du contrat OpenAPI est implémentée par un handler Spring, et inversement. */
class OpenApiContractTest extends AbstractIT {
    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    RequestMappingHandlerMapping mapping;

    static String norm(String path) {
        return path.replaceAll("\\{[^}]+}", "{}");
    }

    @Test
    @SuppressWarnings("unchecked")
    void chaqueOperationDuContratEstMappee() throws Exception {
        Map<String, Object> spec;
        try (InputStream in = new ClassPathResource("openapi/openapi.yaml").getInputStream()) {
            spec = new Yaml().load(in);
        }
        Set<String> contract = new HashSet<>();
        Map<String, Map<String, Object>> paths = (Map<String, Map<String, Object>>) spec.get("paths");
        paths.forEach((path, ops) -> ops.keySet().stream()
                .filter(m -> Set.of("get", "post", "put", "delete", "patch").contains(m))
                .forEach(m -> contract.add(m.toUpperCase() + " " + norm(path))));

        Set<String> implemented = new HashSet<>();
        for (RequestMappingInfo info : mapping.getHandlerMethods().keySet()) {
            if (info.getPathPatternsCondition() == null) continue;
            for (String p : info.getPathPatternsCondition().getPatternValues()) {
                if (!p.startsWith("/api/")) continue;
                Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
                for (RequestMethod m : methods) implemented.add(m.name() + " " + norm(p));
            }
        }
        List<String> missing = new ArrayList<>(contract);
        missing.removeAll(implemented);
        List<String> undocumented = new ArrayList<>(implemented);
        undocumented.removeAll(contract);
        assertThat(missing).as("opérations du contrat non implémentées").isEmpty();
        assertThat(undocumented).as("endpoints hors contrat").isEmpty();
        assertThat(contract).hasSizeGreaterThan(40);
    }
}
