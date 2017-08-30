/*
   This file was generated automatically by the Mojo IDE version B1.3.6.
   Do not edit this file directly. Instead edit the original Lucid source.
   This is a temporary file and any changes made to it will be destroyed.
*/

module pinSwitch_3 (
    input clk,
    input rst,
    input bbPinSwitch,
    input [7:0] tripData,
    output reg [7:0] pinSwitchData
  );
  
  
  
  wire [1-1:0] M_bbPinSwitchSync_out;
  reg [1-1:0] M_bbPinSwitchSync_in;
  pipeline_6 bbPinSwitchSync (
    .clk(clk),
    .in(M_bbPinSwitchSync_in),
    .out(M_bbPinSwitchSync_out)
  );
  reg [7:0] M_pinSwitchBuff_d, M_pinSwitchBuff_q = 1'h0;
  
  always @* begin
    M_pinSwitchBuff_d = M_pinSwitchBuff_q;
    
    M_bbPinSwitchSync_in = bbPinSwitch;
    pinSwitchData = M_pinSwitchBuff_q;
    if (M_bbPinSwitchSync_out && (tripData == 1'h0)) begin
      M_pinSwitchBuff_d = 1'h1;
    end else begin
      M_pinSwitchBuff_d = 1'h0;
    end
  end
  
  always @(posedge clk) begin
    if (rst == 1'b1) begin
      M_pinSwitchBuff_q <= 1'h0;
    end else begin
      M_pinSwitchBuff_q <= M_pinSwitchBuff_d;
    end
  end
  
endmodule
