import org.json.JSONObject;
import org.json.JSONArray;

public class java {
    public static JSONObject getConfig() {
        JSONObject config = new JSONObject();
        
        // Classpath entries for compilation and runtime
        JSONArray classpath = new JSONArray();
        classpath.put(".");
        classpath.put("lib/*");
        classpath.put("src/java/main/java");
        classpath.put("src/java/test/java");
        // Add specific JUnit JARs
        classpath.put("lib/junit-platform-console-standalone.jar");
        classpath.put("lib/junit-jupiter-api.jar");
        classpath.put("lib/junit-jupiter-engine.jar");
        classpath.put("lib/assertj-core.jar");
        classpath.put("lib/json.jar");
        config.put("classpath", classpath);
        
        // Whether to compile Java files (default is true)
        config.put("compile", true);
        
        return config;
    }
}
