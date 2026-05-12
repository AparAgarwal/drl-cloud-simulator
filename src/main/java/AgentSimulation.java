import org.cloudsimplus.brokers.DatacenterBroker;
import org.cloudsimplus.brokers.DatacenterBrokerSimple;
import org.cloudsimplus.cloudlets.Cloudlet;
import org.cloudsimplus.cloudlets.CloudletSimple;
import org.cloudsimplus.core.CloudSimPlus;
import org.cloudsimplus.datacenters.DatacenterSimple;
import org.cloudsimplus.hosts.Host;
import org.cloudsimplus.hosts.HostSimple;
import org.cloudsimplus.resources.Pe;
import org.cloudsimplus.resources.PeSimple;
import org.cloudsimplus.vms.Vm;
import org.cloudsimplus.vms.VmSimple;
import org.cloudsimplus.util.Log;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class AgentSimulation {

    // --- CONFIGURATION ---
    private static final String STATE_FILE = "state.json";
    private static final String ACTION_FILE = "action.json";
    private static final String REWARD_FILE = "reward.json";
    private static final String DONE_FILE = "training_done.flag";
    private static final String JAVA_LOG_FILE = "java_performance.csv";

    private static final int HOSTS = 5;
    private static final int VMS = 5;
    private static final int CLOUDLETS = 500;
    private static final double COST_PER_SEC = 0.1;
    private static final long SEED = 42;
    private static final int TOTAL_EPOCHS = 20;

    public static void main(String[] args) throws InterruptedException, IOException {
        Log.setLevel(ch.qos.logback.classic.Level.ERROR);
        System.out.println("============================================");
        System.out.printf("STARTING HIGH-FREQUENCY DRL TRAINING (%d Epochs)\n", TOTAL_EPOCHS);
        System.out.println("============================================\n");
        // Notify bridge (best-effort)
        try { sendLog("info", "Java AgentSimulation started", "java-agent"); } catch (Exception e) {}

        // Safe CSV Initialization (Append mode, only write headers if new)
        File logFile = new File(JAVA_LOG_FILE);
        boolean isNewLog = !logFile.exists();
        try (FileWriter w = new FileWriter(JAVA_LOG_FILE, true)) {
            if (isNewLog) {
                w.write("Epoch,Avg_Turnaround\n");
            }
        }

        for (int epoch = 1; epoch <= TOTAL_EPOCHS; epoch++) {
            System.out.printf("[Java] --- Starting Epoch %d/%d ---\n", epoch, TOTAL_EPOCHS);
            runSimulationEpoch(epoch);
            Thread.sleep(1000); // Breathe between epochs
        }

        new File(DONE_FILE).createNewFile();
        System.out.println("\n[System] Training Complete. Signal sent to shut down Python Agent.");
        try { sendLog("info", "Training complete. Done flag created.", "java-agent"); } catch (Exception e) {}
    }

    private static void runSimulationEpoch(int epoch) throws InterruptedException, IOException {
        CloudSimPlus simulation = new CloudSimPlus();
        createDatacenter(simulation);
        DatacenterBroker broker = new DatacenterBrokerSimple(simulation);
        List<Vm> vmList = createVms();
        broker.submitVmList(vmList);

        List<Cloudlet> cloudletList = new ArrayList<>();
        Random random = new Random(SEED + epoch);

        double[] vmLoads = new double[VMS];

        for (int i = 0; i < CLOUDLETS; i++) {
            long length = 10000 + random.nextInt(40000);
            Cloudlet cloudlet = new CloudletSimple(length, 1);

            // NORMALIZED TASK SIZE: Divide by 50000 so the AI sees a number between 0.2 and 1.0
            writeStateToJson(vmLoads, (double) length / 50000.0);

            int vmIndex = waitForAction();
            if (vmIndex >= VMS) vmIndex = VMS - 1;

            vmLoads[vmIndex] += (double) length / 50000.0;

            double stepReward = 10.0 - vmLoads[vmIndex];
            writeRewardToJson(stepReward);

            // SYNCHRONIZATION LOCK: Wait for Python to read the reward
            File rewardFile = new File(REWARD_FILE);
            while (rewardFile.exists()) {
                Thread.sleep(1);
            }

            cloudlet.setVm(vmList.get(vmIndex));
            cloudlet.setSubmissionDelay(i * 0.01);
            cloudletList.add(cloudlet);

            if (i % 100 == 0) System.out.printf("[Java] Planning Task %d/%d...\r", i, CLOUDLETS);
            if (i % 100 == 0) {
                try { sendLog("debug", "Planning progress: " + i + "/" + CLOUDLETS, "java-agent"); } catch (Exception e) {}
            }
            for (int j = 0; j < VMS; j++) {
                vmLoads[j] = Math.max(0, vmLoads[j] - 0.1);
            }
        }

        broker.submitCloudletList(cloudletList);
        simulation.start();

        List<Cloudlet> finished = broker.getCloudletFinishedList();
        double avgTurnaround = finished.stream().mapToDouble(c -> c.getFinishTime() - c.getSubmissionDelay()).average().orElse(1000);

        System.out.printf("  > Epoch %d Results | ATAT: %.2f s \n", epoch, avgTurnaround);
        try (FileWriter w = new FileWriter(JAVA_LOG_FILE, true)) {
            w.write(String.format("%d,%.2f\n", epoch, avgTurnaround));
        }
        try { sendLog("info", "Epoch " + epoch + " complete. ATAT=" + String.format("%.2f", avgTurnaround), "java-agent"); } catch (Exception e) {}
    }

    // Updated to accept double for taskSize
    private static void writeStateToJson(double[] loads, double taskSize) {
        String json = String.format("{\"l0\": %.2f, \"l1\": %.2f, \"l2\": %.2f, \"l3\": %.2f, \"l4\": %.2f, \"task_size\": %.2f}",
                loads[0], loads[1], loads[2], loads[3], loads[4], taskSize);
        writeAtomic(STATE_FILE, json);
    }

    private static void writeRewardToJson(double reward) {
        writeAtomic(REWARD_FILE, String.format("{\"reward\": %.2f}", reward));
    }

    private static int waitForAction() throws InterruptedException, IOException {
        while (true) {
            File file = new File(ACTION_FILE);
            while (!file.exists()) { Thread.sleep(5); }
            Thread.sleep(5);
            try {
                String content = new String(Files.readAllBytes(Paths.get(ACTION_FILE)));
                String numberOnly = content.replaceAll("[^0-9]", "").trim();
                if (numberOnly.isEmpty()) {
                    try { sendLog("warn", "Received empty/invalid action file, retrying", "java-agent"); } catch (Exception e) {}
                    try { file.delete(); } catch (Exception e) {}
                    Thread.sleep(10);
                    continue;
                }
                try { file.delete(); } catch (Exception e) {}
                return Integer.parseInt(numberOnly);
            } catch (NumberFormatException nfe) {
                try { sendLog("warn", "Action parse failed", "java-agent"); } catch (Exception e) {}
                Thread.sleep(10);
            } catch (Exception e) {
                // File is locked or partially written by Python. Ignore and retry.
                Thread.sleep(5);
            }
        }
    }

    private static void sendLog(String level, String msg, String source) {
        try {
            URL url = new URL("http://localhost:4000/log");
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("POST");
            con.setRequestProperty("Content-Type", "application/json; utf-8");
            con.setDoOutput(true);
            String json = String.format("{\"level\":\"%s\",\"msg\":\"%s\",\"source\":\"%s\"}", level, msg.replaceAll("\"","\\\""), source);
            byte[] out = json.getBytes(StandardCharsets.UTF_8);
            con.getOutputStream().write(out);
            int resp = con.getResponseCode();
            con.disconnect();
        } catch (Exception e) {
            // best-effort logging; ignore
        }
    }

    private static void writeAtomic(String path, String content) {
        File tmp = new File(path + ".tmp");
        try (FileWriter w = new FileWriter(tmp)) {
            w.write(content);
        } catch (IOException e) {
            return;
        }
        try {
            Files.move(tmp.toPath(), Paths.get(path), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (Exception e) {
            try (FileWriter w = new FileWriter(path)) {
                w.write(content);
            } catch (IOException ex) {
                // ignore
            }
            try { tmp.delete(); } catch (Exception ex) {}
        }
    }

    private static void createDatacenter(CloudSimPlus sim) {
        List<Host> hosts = new ArrayList<>();
        for (int i = 0; i < HOSTS; i++) {
            hosts.add(new HostSimple(32768, 1000000, 1000000, List.of(new PeSimple(10000))));
        }
        new DatacenterSimple(sim, hosts).getCharacteristics().setCostPerSecond(COST_PER_SEC);
    }

    private static List<Vm> createVms() {
        List<Vm> list = new ArrayList<>();
        for (int i = 0; i < VMS; i++) {
            list.add(new VmSimple(5000, 1).setRam(1024).setBw(1000).setSize(10000));
        }
        return list;
    }
}