package pe.smartstay.nearby

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*

/** Transport only: JS validates and commits SQLite before sending the application ACK. */
class SmartStayNearbyModule : Module() {
  private val client get() = Nearby.getConnectionsClient(requireNotNull(appContext.reactContext))
  private val service = "pe.smartstay.roomshare.v1"
  private var running = false
  private var peer: String? = null
  private var accepted = false
  private var connected = false
  private fun event(type: String, id: String = "", value: String = "") {
    if (running) sendEvent("onNearby", mapOf("type" to type, "id" to id, "value" to value))
  }
  private fun failure(e: Exception) { event("error", value = e.message ?: "Nearby falló") }
  private fun stop() {
    running = false
    client.stopAdvertising(); client.stopDiscovery(); client.stopAllEndpoints()
    peer = null; accepted = false; connected = false
  }
  private val payloads = object : PayloadCallback() {
    override fun onPayloadReceived(id: String, payload: Payload) {
      if (!connected || !accepted || id != peer) return
      val bytes = payload.asBytes()
      if (payload.type != Payload.Type.BYTES || bytes == null || bytes.size > 4096) {
        event("error", value = "Mensaje inválido o mayor a 4 KB"); return
      }
      event("message", id, String(bytes, Charsets.UTF_8))
    }
    override fun onPayloadTransferUpdate(id: String, update: PayloadTransferUpdate) {
      if (update.status == PayloadTransferUpdate.Status.FAILURE) event("error", id, "Transferencia fallida")
    }
  }
  private val lifecycle = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(id: String, info: ConnectionInfo) {
      if (!running || (peer != null && peer != id)) { client.rejectConnection(id); return }
      peer = id
      event("verify", id, info.authenticationDigits)
    }
    override fun onConnectionResult(id: String, result: ConnectionResolution) {
      if (!running || id != peer) return
      if (result.status.isSuccess && accepted) {
        connected = true
        client.stopAdvertising(); client.stopDiscovery()
        event("connected", id)
      } else event("error", id, "Conexión rechazada o fallida")
    }
    override fun onDisconnected(id: String) { connected = false; event("disconnected", id) }
  }
  override fun definition() = ModuleDefinition {
    Name("SmartStayNearby")
    Events("onNearby")
    AsyncFunction("start") { receiving: Boolean ->
      stop(); running = true
      if (receiving) client.startAdvertising("SmartStay", service, lifecycle,
        AdvertisingOptions.Builder().setStrategy(Strategy.P2P_POINT_TO_POINT).build()).addOnFailureListener { failure(it) }
      else client.startDiscovery(service, object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(id: String, info: DiscoveredEndpointInfo) { event("found", id, info.endpointName) }
        override fun onEndpointLost(id: String) { event("lost", id) }
      }, DiscoveryOptions.Builder().setStrategy(Strategy.P2P_POINT_TO_POINT).build()).addOnFailureListener { failure(it) }
    }
    AsyncFunction("connect") { id: String ->
      check(running && peer == null)
      peer = id
      client.requestConnection("SmartStay", id, lifecycle).addOnFailureListener { failure(it) }
    }
    AsyncFunction("confirm") { id: String, agree: Boolean ->
      check(running && peer == id)
      if (agree) { accepted = true; client.acceptConnection(id, payloads).addOnFailureListener { failure(it) } }
      else { client.rejectConnection(id); stop() }
    }
    AsyncFunction("send") { id: String, message: String ->
      check(running && connected && accepted && peer == id)
      val bytes = message.toByteArray(Charsets.UTF_8)
      require(bytes.size <= 4096)
      client.sendPayload(id, Payload.fromBytes(bytes)).addOnFailureListener { failure(it) }
    }
    AsyncFunction("stop") { stop() }
    OnActivityEntersBackground { stop() }
    OnDestroy { stop() }
  }
}
